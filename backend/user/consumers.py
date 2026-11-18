import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils.timezone import localtime, now
from datetime import datetime

from .models import Message, FlaggedMessage
from model.test import approve


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        self.warning = (
            "Formal tone only, contact exchange is not permitted."
        )

        self.sender = self.scope["user"]
        self.chat_room_names = set()

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

                for room_name in getattr(self, "chat_room_names", set()):
                    await self.channel_layer.group_discard(
                        room_name,
                        self.channel_name
                    )

        except Exception as e:
            print(f"[WS] Error in disconnect: {e}")

    @database_sync_to_async
    def save_flagged_message(self, content):
        FlaggedMessage.objects.create(text=content)

    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, content, variant_id=None, owner_id=None):

        if (
            content != self.warning
            and sender_id != receiver_id
        ):

            Message.objects.create(
                sender_id=sender_id,
                receiver_id=receiver_id,
                content=content,
                read=False,
                variant_id=variant_id,
                owner_id=owner_id
            )

    async def chat_message_personal(self, event):

        message_data = {
            "scope": "personal",
            "text": event["text"],
            "sender_id": event["sender_id"],
            "receiver_id": event["receiver_id"],
            "created_at": event["created_at"],
            "variant_id": event.get("variant_id"),
            "owner_id": event.get("owner_id"),
        }

        await self.send(
            text_data=json.dumps(message_data)
        )

    async def chat_message_group(self, event):

        print("EVent", event)
        message_data = {
            "scope": "group",
            "text": event["text"],
            "sender_id": event["sender_id"],
            "receiver_id": event["receiver_id"],
            "created_at": event["created_at"],
            "variant_id": event.get("variant_id"),
            "owner_id": event.get("owner_id"),
        }
        await self.send(
            text_data=json.dumps(message_data)
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            print("[WS RECEIVE]", data)

            # Handle chat room connection separately
            if data.get("type") == "connect_chat":
                receiver_id = data.get("receiver_id")

                if not receiver_id:
                    print("[WS ERROR] Missing receiver_id for connect_chat")
                    return

                room_group_name = (
                    f"chat_"
                    f"{min(int(self.sender.id), int(receiver_id))}_"
                    f"{max(int(self.sender.id), int(receiver_id))}"
                )

                await self.channel_layer.group_add(
                    room_group_name,
                    self.channel_name
                )

                self.chat_room_names.add(room_group_name)

                print(
                    f"[WS JOINED CHAT ROOM] User {self.sender.id}: "
                    f"{room_group_name}"
                )
                return

            # Process actual chat messages
            content = data["message"]
            receiver_id = data["receiver_id"]
            variant_id = data.get("variant_id") or None
            owner_id = data.get("owner_id") or None

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            print(f"[WS ERROR] Error parsing message: {e}")
            return

        if not approve(content):
            asyncio.create_task(
                self._async_save_flagged_message(content)
            )
            content = self.warning

        base_data = {
            "text": content,
            "sender_id": self.sender.id,
            "receiver_id": receiver_id,
            "created_at": datetime.now().isoformat(),
            "variant_id": variant_id,
            "owner_id": owner_id,
        }

        room_group_name = (
            f"chat_"
            f"{min(int(self.sender.id), int(receiver_id))}_"
            f"{max(int(self.sender.id), int(receiver_id))}"
        )

        # Broadcast to both participants in the active chat room
        await self.channel_layer.group_send(
            room_group_name,
            {
                "type": "chat_message_group",
                **base_data
            }
        )

        # Keep personal notification for global notifications
        asyncio.create_task(
            self._async_send_personal(receiver_id, base_data)
        )

        asyncio.create_task(
            self._async_save_message(base_data, content)
        )

    async def _async_send_personal(
        self,
        receiver_id,
        base_data
    ):

        try:
            id = receiver_id
            if base_data["text"] == self.warning:
                id = self.sender.id
            personal_room_name = f"chat_{id}"

            await self.channel_layer.group_send(
                personal_room_name,
                {
                    "type": "chat_message_personal",
                    **base_data
                }
            )
            print("sent", base_data["text"])

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
                    content,
                    base_data.get("variant_id"),
                    base_data.get("owner_id")
                ),
                return_exceptions=True
            )

        except Exception as e:

            print(
                f"[v0] Error in async save/preview: {e}"
            )

    async def _async_save_flagged_message(self, content):
        try:
            await self.save_flagged_message(content)
        except Exception as e:
            print(f"Error saving flagged message: {e}")