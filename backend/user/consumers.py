import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Message, ChatPreview
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils.timezone import localtime, now

from model.test import predict
from asgiref.sync import sync_to_async
from django.http import JsonResponse
from urllib.parse import parse_qs

class ChatConsumer(AsyncWebsocketConsumer):
    warning = "Warning, few more and you'll be suspended"
    async def connect(self):
        query_string = self.scope["query_string"].decode()
        params = parse_qs(query_string)
        self.product_id = params.get("product", [None])[0]
        self.owner_id = params.get("owner", [None])[0]

        self.sender = self.scope["user"]  # The authenticated user making the connection
        self.receiver_id = self.scope["url_route"]["kwargs"]["user_id"]  # The user being chatted with

        print(f"sender: {self.sender.id}, receiver: {self.receiver_id}")

        if not self.channel_layer:
            print("Channel layer is None!")

        if isinstance(self.sender, AnonymousUser):  # Reject unauthenticated
            await self.close()
            return JsonResponse({"message": "Anonymous User"})
        else:
            self.personal_room_name = f"chat_{int(self.receiver_id)}"
            self.room_group_name = f"chat_{min(int(self.sender.id), int(self.receiver_id))}_{max(int(self.sender.id), int(self.receiver_id))}"
            await self.channel_layer.group_add(self.personal_room_name, self.channel_name)
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept() 

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.personal_room_name, self.channel_name)
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        content = data['message']
        print("received",content)
        receiver_id = self.receiver_id

        if self.sender.is_blacklisted:
            await self.send(text_data=json.dumps({
                'error': 'You have been blacklisted and cannot send messages.'
            }))
            return

        if self.sender.is_suspended:
            if localtime(now()) < self.sender.suspension_until:
                await self.send(text_data=json.dumps({
                    'error': f"You are suspended until {self.sender.suspension_until}."
                }))
                return
            else:
                self.sender.is_suspended = False
                self.sender.suspension_until = None
                await sync_to_async(self.sender.save)()

        if predict(content) not in ["negotiation", "general chat"]:
            content =self.warning
            
            # maliciousUser = self.sender
            # maliciousUser.contact_violation_count += 1
            # if maliciousUser.contact_violation_count >= 3 and not maliciousUser.is_blacklisted:
            #     maliciousUser.is_blacklisted = True
            #     # Optional: disable messaging, notify admin, etc.
            # elif maliciousUser.contact_violation_count == 2 and not maliciousUser.is_suspended:
            #     maliciousUser.is_suspended = True
            #     maliciousUser.suspension_until = localtime(now()) + timezone.timedelta(hours=24)
            #     # Optional: suspend for a time period
            # await sync_to_async(maliciousUser.save)()

        await self.save_message(self.sender.id, receiver_id, content)  # Save to DB
        await self.update_chat_preview(int(self.sender.id), int(receiver_id), content)

        base_data = {
            'text': content,
            'sender_id': self.sender.id,
            'receiver_id': receiver_id,
            'created_at': localtime(now()).strftime("%H:%M"),
        }

        # Add product_id if available
        if self.product_id and self.owner_id:
            base_data['product_id'] = self.product_id
            base_data['owner_id'] = self.owner_id

        # Send to personal room
        print(base_data)
        asyncio.create_task(
            self.channel_layer.group_send(
                self.personal_room_name,
                {
                    'type': 'chat_message_personal',
                    **base_data
                }
            )
        )

        # Send to group room
        print(base_data)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message_group',
                **base_data
            }
        )

    # For personal chat message
    async def chat_message_personal(self, event):
        message_data = {
            'scope': 'personal',
            'text': event['text'],
            'sender_id': event['sender_id'],
            'receiver_id': event['receiver_id'],
            'created_at': event['created_at'],
        }

        # Add product_id if it exists in the event
        if 'product_id' in event and 'owner_id' in event:
            message_data['product_id'] = event['product_id']
            message_data['owner_id'] = event['owner_id']

        await self.send(text_data=json.dumps(message_data))

    # For group chat message
    async def chat_message_group(self, event):
        message_data = {
            'scope': 'group',
            'text': event['text'],
            'sender_id': event['sender_id'],
            'receiver_id': event['receiver_id'],
            'created_at': event['created_at'],
        }

        # Add product_id if it exists in the event
        if 'product_id' in event and 'owner_id' in event:
            message_data['product_id'] = event['product_id']
            message_data['owner_id'] = event['owner_id']

        await self.send(text_data=json.dumps(message_data))

    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, content):
        if content !=self.warning:
            Message.objects.create(sender_id=sender_id, receiver_id=receiver_id, content=content)

    @database_sync_to_async
    def update_chat_preview(self, sender_id, receiver_id, content):
        if content != self.warning:
            # Always order sender and receiver so smaller id is first
            first_user_id = min(sender_id, receiver_id)
            second_user_id = max(sender_id, receiver_id)

            ChatPreview.objects.update_or_create(
                sender_id=first_user_id,
                receiver_id=second_user_id,
                defaults={
                    'latest_message': content,
                    'time': localtime(now())
                }
            )