from django.dispatch import receiver
from django.db.models.signals import post_save
from django.db.models import Q
from user.models import Message, ChatPreview
from django.utils.timezone import localtime, now
import logging
import threading
import os
from product.tasks import browser_notify



from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Message)
def update_chat_preview(sender, instance, created, **kwargs):
    print("[SIGNAL] Message save detected")

    user1 = instance.sender
    user2 = instance.receiver

    try:
        # Always normalize conversation pair
        first_user_id = min(user1.id, user2.id)
        second_user_id = max(user1.id, user2.id)

        print(f"[SIGNAL] Users -> {first_user_id}, {second_user_id}")

        # GET OR CREATE preview
        chatpreview, preview_created = ChatPreview.objects.get_or_create(
            sender_id=first_user_id,
            receiver_id=second_user_id,
            defaults={
                "latest_message": instance.content,
                "time": localtime(now()),
                "actual_sender_id": user1.id,
                "actual_receiver_id": user2.id,
                "unread": 0,
            }
        )

        print(f"[SIGNAL] ChatPreview exists: {not preview_created}")

        # ALWAYS update latest message
        chatpreview.latest_message = instance.content
        chatpreview.time = localtime(now())
        chatpreview.actual_sender_id = user1.id
        chatpreview.actual_receiver_id = user2.id

        # CASE 1: new message → increase unread
        if created and not instance.read:
            chatpreview.unread = (chatpreview.unread or 0) + 1
            print("[SIGNAL] Unread incremented")

        # CASE 2: message marked as read → decrease unread
        elif not created and instance.read:
            chatpreview.unread = max((chatpreview.unread or 0) - 1, 0)
            print("[SIGNAL] Unread decremented")

        chatpreview.save()

        print("[SIGNAL] ChatPreview updated successfully")

    except Exception as e:
        print("[SIGNAL ERROR]", e)


@receiver(post_save, sender=Message)
def send_push_notification(sender, instance, created, **kwargs):
    if created and not instance.read:
        print("passed conditionals") 
        receiver = instance.receiver
        sender = instance.sender
        try:
            user_Id = receiver.id
            subject = "New Message"
            message = instance.content
            url = str(f"https://{os.getenv('JALE_DYNAMIC_URL')}/chat/{sender.id}")


            # This task is loacted in product.task because its also used for Products
            browser_notify(user_Id, subject, message, url)            
            print({'status': 'Notification task queued'})
        except Exception as e:
            return print({'error': str(e)}, status=400)