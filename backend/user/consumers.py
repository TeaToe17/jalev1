import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils.timezone import localtime, now
from datetime import datetime

from .models import Message
from model.test import approve


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        self.warning = (
            "Formal tone only, contact exchange is not permitted."
        )

        self.sender = self.scope["user"]

        if not self.channel_layer:
            print("[v0] Channel layer is None!")
            await self.close()
            return

        if isinstance(self.sender, AnonymousUser):
            await self.close()
            return

        # Personal notifications room
        self.personal_room_name = f"chat_{self.sender.id}"

        await self.channel_layer.group_add(
            self.personal_room_name,
            self.channel_name
        )   

        await self.accept()

    async def disconnect(self, close_code):

        try:

            if self.channel_layer:

                if hasattr(self, "personal_room_name"):

                    await self.channel_layer.group_discard(
                        self.personal_room_name,
                        self.channel_name
                    )

        except Exception as e:
            print(f"[v0] Error in disconnect: {e}")

    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, content):

        if (
            content != self.warning
            and sender_id != receiver_id
        ):

            Message.objects.create(
                sender_id=sender_id,
                receiver_id=receiver_id,
                content=content,
                read=False
            )

    async def chat_message_personal(self, event):

        message_data = {
            "scope": "personal",
            "text": event["text"],
            "sender_id": event["sender_id"],
            "receiver_id": event["receiver_id"],
            "created_at": event["created_at"],
        }

        if (
            "product_id" in event
            and "owner_id" in event
        ):

            message_data["product_id"] = event["product_id"]
            message_data["owner_id"] = event["owner_id"]

        await self.send(
            text_data=json.dumps(message_data)
        )

    async def chat_message_group(self, event):

        message_data = {
            "scope": "group",
            "text": event["text"],
            "sender_id": event["sender_id"],
            "receiver_id": event["receiver_id"],
            "created_at": event["created_at"],
        }

        if (
            "product_id" in event
            and "owner_id" in event
        ):

            message_data["product_id"] = event["product_id"]
            message_data["owner_id"] = event["owner_id"]

        await self.send(
            text_data=json.dumps(message_data)
        )

    async def receive(self, text_data):

        try:

            data = json.loads(text_data)
            print(data)
            content = data["message"]
            receiver_id = data["receiver_id"]
            product_id = data.get("product_id")
            owner_id = data.get("owner_id")

        except (
            json.JSONDecodeError,
            KeyError
        ) as e:

            print(f"[v0] Error parsing message: {e}")
            return

        if not approve(content):
            content = self.warning

        # Dynamic room
        room_group_name = (
            f"chat_"
            f"{min(int(self.sender.id), int(receiver_id))}_"
            f"{max(int(self.sender.id), int(receiver_id))}"
        )

        base_data = {
            "text": content,
            "sender_id": self.sender.id,
            "receiver_id": receiver_id,
            "created_at": datetime.now().isoformat(),
        }

        if product_id and owner_id:

            base_data["product_id"] = product_id
            base_data["owner_id"] = owner_id

        # Send to active chat room
        await self.channel_layer.group_send(
            room_group_name,
            {
                "type": "chat_message_group",
                **base_data
            }
        )

        # Send notification to receiver
        asyncio.create_task(
            self._async_send_personal(
                receiver_id,
                base_data
            )
        )

        # Save message
        asyncio.create_task(
            self._async_save_message(
                base_data,
                content
            )
        )

    async def _async_send_personal(
        self,
        receiver_id,
        base_data
    ):

        try:

            personal_room_name = f"chat_{receiver_id}"

            await self.channel_layer.group_send(
                personal_room_name,
                {
                    "type": "chat_message_personal",
                    **base_data
                }
            )

        except Exception as e:

            print(
                f"[v0] Error sending personal message: {e}"
            )

    async def _async_save_message(
        self,
        base_data,
        content
    ):

        try:

            await asyncio.gather(
                self.save_message(
                    base_data["sender_id"],
                    base_data["receiver_id"],
                    content
                ),
                return_exceptions=True
            )

        except Exception as e:

            print(
                f"[v0] Error in async save/preview: {e}"
            )
