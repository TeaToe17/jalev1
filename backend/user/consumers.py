import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils.timezone import localtime, now
from django.db.models import Q, F
from urllib.parse import parse_qs
from .models import Message, ChatPreview
from model.test import approve


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope["query_string"].decode()
        params = parse_qs(query_string)
        self.product_id = params.get("product", [None])[0]
        self.owner_id = params.get("owner", [None])[0]
        self.warning = "Formal tone only, contact exchange is not permitted."

        self.sender = self.scope["user"]
        self.receiver_id = int(self.scope["url_route"]["kwargs"]["user_id"])

        # Reject unauthenticated users
        if isinstance(self.sender, AnonymousUser):
            await self.close()
            return

        # Build room names
        self.personal_room_name = f"chat_{self.receiver_id}"
        self.room_group_name = f"chat_{min(self.sender.id, self.receiver_id)}_{max(self.sender.id, self.receiver_id)}"

        # ✅ Accept connection immediately
        await self.accept()

        # ✅ Add to groups
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.channel_layer.group_add(self.personal_room_name, self.channel_name)

        print(f"✅ WebSocket connected: user={self.sender.id} room={self.room_group_name}")

    async def disconnect(self, close_code):
        try:
            if hasattr(self, "room_group_name"):
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            if hasattr(self, "personal_room_name"):
                await self.channel_layer.group_discard(self.personal_room_name, self.channel_name)
        except Exception as e:
            print(f"Error during disconnect: {e}")

    # -----------------------------
    # Message saving (DB safe)
    # -----------------------------
    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, content):
        if content != self.warning and sender_id != receiver_id:
            Message.objects.create(
                sender_id=sender_id,
                receiver_id=receiver_id,
                content=content,
                read=False,
            )

    @database_sync_to_async
    def update_chat_preview(self, sender_id, receiver_id, content):
        if content == self.warning:
            return

        first_user_id = min(sender_id, receiver_id)
        second_user_id = max(sender_id, receiver_id)

        if first_user_id != second_user_id:
            try:
                ChatPreview.objects.update_or_create(
                    sender_id=first_user_id,
                    receiver_id=second_user_id,
                    defaults={
                        "latest_message": content,
                        "time": localtime(now()),
                        "actual_sender_id": sender_id,
                        "actual_receiver_id": receiver_id,
                    },
                )
                ChatPreview.objects.filter(
                    Q(sender_id=sender_id, receiver_id=receiver_id)
                    | Q(sender_id=receiver_id, receiver_id=sender_id)
                ).update(unread=F("unread") + 1)
            except Exception as e:
                print("ChatPreview save error:", e)

    # -----------------------------
    # Message handlers
    # -----------------------------
    async def chat_message_personal(self, event):
        await self.send(text_data=json.dumps({
            "scope": "personal",
            **event
        }))

    async def chat_message_group(self, event):
        await self.send(text_data=json.dumps({
            "scope": "group",
            **event
        }))

    # -----------------------------
    # Receive message from WebSocket
    # -----------------------------
    async def receive(self, text_data):
        data = json.loads(text_data)
        content = data.get("message", "")
        if not approve(content):
            content = self.warning

        base_data = {
            "text": content,
            "sender_id": self.sender.id,
            "receiver_id": self.receiver_id,
            "created_at": localtime(now()).strftime("%H:%M"),
        }

        if self.product_id and self.owner_id:
            base_data["product_id"] = self.product_id
            base_data["owner_id"] = self.owner_id

        # ✅ Send to group room first
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "chat_message_group", **base_data}
        )

        # ✅ Send to personal room
        await self.channel_layer.group_send(
            self.personal_room_name, {"type": "chat_message_personal", **base_data}
        )

        # ✅ Non-blocking DB saves
        await self.save_message(self.sender.id, self.receiver_id, content)
        await self.update_chat_preview(self.sender.id, self.receiver_id, content)
