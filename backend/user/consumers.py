import json
import asyncio
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils.timezone import localtime, now
from django.db.models import Q, F

from .models import Message, ChatPreview
from model.test import approve


class ChatConsumer(AsyncWebsocketConsumer):
    """Async, scalable ChatConsumer for Django Channels.

    Key points:
    - Uses AsyncWebsocketConsumer (no thread-per-connection)
    - Uses database_sync_to_async for ORM operations
    - Uses asyncio.create_task for background tasks (non-blocking)
    - Minimizes duplicate broadcasts (single pair-room by default)
    - Keeps optional product metadata if present in query string
    """

    async def connect(self):
        # parse query string for optional product/owner
        query_string = self.scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        self.product_id = params.get("product", [None])[0]
        self.owner_id = params.get("owner", [None])[0]
        self.warning = "Formal tone only, contact exchange is not permitted."

        self.sender = self.scope.get("user")
        # url route kwargs come from routing; ensure it's present
        self.receiver_id = self.scope.get("url_route", {}).get("kwargs", {}).get("user_id")

        # Reject unauthenticated users
        if isinstance(self.sender, AnonymousUser) or not getattr(self.sender, 'id', None):
            await self.close()
            return

        # canonical pair room name to broadcast messages between two participants
        try:
            a = int(self.sender.id)
            b = int(self.receiver_id)
            self.room_group_name = f"chat_{min(a,b)}_{max(a,b)}"
        except Exception:
            # fallback: per-user personal room
            self.room_group_name = f"chat_user_{self.sender.id}"

        # join the room
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        except Exception:
            # swallow errors on disconnect
            pass

    # -------------------------
    # Helper DB functions
    # -------------------------
    @database_sync_to_async
    def _save_message_db(self, sender_id, receiver_id, content):
        # synchronous DB write executed in a threadpool by channels
        if content != self.warning and sender_id != receiver_id:
            Message.objects.create(sender_id=sender_id, receiver_id=receiver_id, content=content, read=False)

    @database_sync_to_async
    def _update_chat_preview_db(self, sender_id, receiver_id, content):
        if content == self.warning:
            return

        first_user_id = min(sender_id, receiver_id)
        second_user_id = max(sender_id, receiver_id)
        if first_user_id == second_user_id:
            return

        try:
            ChatPreview.objects.update_or_create(
                sender_id=first_user_id,
                receiver_id=second_user_id,
                defaults={
                    'latest_message': content,
                    'time': localtime(now()),
                    'actual_sender_id': sender_id,
                    'actual_receiver_id': receiver_id,
                }
            )
        except Exception:
            # don't let a preview failure crash the consumer
            return

        # increment unread if preview exists for this conversation orientation
        try:
            chatpreview = ChatPreview.objects.get(
                Q(sender_id=sender_id, receiver_id=receiver_id) |
                Q(sender_id=receiver_id, receiver_id=sender_id)
            )
            chatpreview.unread = F('unread') + 1
            chatpreview.save()
        except ChatPreview.DoesNotExist:
            pass

    # -------------------------
    # Broadcasting helpers
    # -------------------------
    async def _broadcast_message(self, payload):
        """Send to the canonical pair room. Consumers listening on that room will receive it.

        Keep broadcasts minimal: single group_send per user message.
        """
        await self.channel_layer.group_send(self.room_group_name, {
            'type': 'chat.message',
            **payload,
        })

    # Consumer event handler (name derived from 'type' key with '.' replaced by '_')
    async def chat_message(self, event):
        # standardize outgoing payload
        payload = {
            'text': event.get('text'),
            'sender_id': event.get('sender_id'),
            'receiver_id': event.get('receiver_id'),
            'created_at': event.get('created_at'),
            'scope': event.get('scope', 'pair'),
        }
        if 'product_id' in event:
            payload['product_id'] = event['product_id']
            payload['owner_id'] = event.get('owner_id')

        await self.send(text_data=json.dumps(payload))

    # -------------------------
    # Receive from WebSocket
    # -------------------------
    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data)
        except Exception:
            return

        content = data.get('message', '')
        if not approve(content):
            content = self.warning

        created_at = localtime(now()).strftime("%H:%M")

        base_data = {
            'text': content,
            'sender_id': int(self.sender.id),
            'receiver_id': int(self.receiver_id) if self.receiver_id is not None else None,
            'created_at': created_at,
            'scope': 'pair',
        }

        if self.product_id and self.owner_id:
            base_data['product_id'] = self.product_id
            base_data['owner_id'] = self.owner_id

        # Broadcast once (non-blocking)
        asyncio.create_task(self._broadcast_message(base_data))

        # Save message and update preview asynchronously (background tasks)
        # Using create_task so the consumer doesn't block on DB writes.
        if base_data['sender_id'] and base_data['receiver_id']:
            asyncio.create_task(self._save_message_db(base_data['sender_id'], base_data['receiver_id'], content))
            asyncio.create_task(self._update_chat_preview_db(base_data['sender_id'], base_data['receiver_id'], content))

    # -------------------------
    # Utility: graceful shutdown for tasks (optional)
    # -------------------------
    async def close(self, code=None):
        # Channel consumer's close will call disconnect; keep default behavior
        await super().close(code=code)
