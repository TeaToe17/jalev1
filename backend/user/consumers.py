import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils.timezone import localtime, now
from django.db.models import Q, F
from urllib.parse import parse_qs

from .models import Message, ChatPreview
from model.test import approve


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Optimized async WebSocket consumer for handling many concurrent users.
    
    Key improvements:
    - Uses AsyncWebsocketConsumer instead of blocking WebsocketConsumer
    - All database operations are properly async with @database_sync_to_async
    - Eliminates thread creation overhead - uses asyncio tasks instead
    - Reduced database queries with optimized ChatPreview handling
    - Non-blocking group sends with proper async/await
    """

    async def connect(self):
        query_string = self.scope["query_string"].decode()
        params = parse_qs(query_string)
        self.product_id = params.get("product", [None])[0]
        self.owner_id = params.get("owner", [None])[0]
        self.warning = "Formal tone only, contact exchange is not permitted."

        self.sender = self.scope["user"]
        self.receiver_id = self.scope["url_route"]["kwargs"]["user_id"]

        if not self.channel_layer:
            print("[v0] Channel layer is None!")
            await self.close()
            return

        if isinstance(self.sender, AnonymousUser):
            await self.close()
            return

        self.personal_room_name = f"chat_{self.receiver_id}"
        self.room_group_name = f"chat_{min(int(self.sender.id), int(self.receiver_id))}_{max(int(self.sender.id), int(self.receiver_id))}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.channel_layer.group_add(self.personal_room_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        try:
            if self.channel_layer:
                if hasattr(self, 'room_group_name'):
                    await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
                if hasattr(self, 'personal_room_name'):
                    await self.channel_layer.group_discard(self.personal_room_name, self.channel_name)
        except Exception as e:
            print(f"[v0] Error in disconnect: {e}")

    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, content):
        if content != self.warning and sender_id != receiver_id:
            Message.objects.create(
                sender_id=sender_id,
                receiver_id=receiver_id,
                content=content,
                read=False
            )

    @database_sync_to_async
    def update_chat_preview(self, sender_id, receiver_id, content):
        if content != self.warning:
            first_user_id = min(sender_id, receiver_id)
            second_user_id = max(sender_id, receiver_id)
            if first_user_id != second_user_id:
                try:
                    # Single database operation with update_or_create
                    obj, created = ChatPreview.objects.update_or_create(
                        sender_id=first_user_id,
                        receiver_id=second_user_id,
                        defaults={
                            'latest_message': content,
                            'time': localtime(now()),
                            'actual_sender_id': sender_id,
                            'actual_receiver_id': receiver_id,
                            'unread': F('unread') + 1 if not created else 1,
                        }
                    )
                except Exception as e:
                    print(f"[v0] ChatPreview save error: {e}")

    async def chat_message_personal(self, event):
        message_data = {
            'scope': 'personal',
            'text': event['text'],
            'sender_id': event['sender_id'],
            'receiver_id': event['receiver_id'],
            'created_at': event['created_at'],
        }

        if 'product_id' in event and 'owner_id' in event:
            message_data['product_id'] = event['product_id']
            message_data['owner_id'] = event['owner_id']

        await self.send(text_data=json.dumps(message_data))

    async def chat_message_group(self, event):
        message_data = {
            'scope': 'group',
            'text': event['text'],
            'sender_id': event['sender_id'],
            'receiver_id': event['receiver_id'],
            'created_at': event['created_at'],
        }

        if 'product_id' in event and 'owner_id' in event:
            message_data['product_id'] = event['product_id']
            message_data['owner_id'] = event['owner_id']

        await self.send(text_data=json.dumps(message_data))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            content = data['message']
        except (json.JSONDecodeError, KeyError) as e:
            print(f"[v0] Error parsing message: {e}")
            return

        if not approve(content):
            content = self.warning

        base_data = {
            'text': content,
            'sender_id': self.sender.id,
            'receiver_id': self.receiver_id,
            'created_at': localtime(now()).strftime("%H:%M"),
        }

        if self.product_id and self.owner_id:
            base_data['product_id'] = self.product_id
            base_data['owner_id'] = self.owner_id

        # Priority: Send to group room (awaited for delivery guarantee)
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'chat_message_group', **base_data}
        )

        # Create async tasks for non-blocking operations (fire and forget)
        # These run concurrently without blocking the receive method
        asyncio.create_task(self._async_send_personal(base_data))
        asyncio.create_task(self._async_save_and_preview(base_data, content))

    async def _async_send_personal(self, base_data):
        """Non-blocking personal message send"""
        try:
            await self.channel_layer.group_send(
                self.personal_room_name,
                {'type': 'chat_message_personal', **base_data}
            )
        except Exception as e:
            print(f"[v0] Error sending personal message: {e}")

    async def _async_save_and_preview(self, base_data, content):
        """Non-blocking database operations"""
        try:
            # Run both database operations concurrently
            await asyncio.gather(
                self.save_message(base_data['sender_id'], base_data['receiver_id'], content),
                self.update_chat_preview(base_data['sender_id'], base_data['receiver_id'], content),
                return_exceptions=True
            )
        except Exception as e:
            print(f"[v0] Error in async save/preview: {e}")
