from django.dispatch import receiver
from django.db.models.signals import post_save
from django.db.models import Q
from user.models import Message, ChatPreview
import time 
import logging
import threading
import os
from product.tasks import send_notification



from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Message)
def update_chat_preview(sender, instance, created, **kwargs):
    if not created and instance.read:
        user1 = instance.sender
        user2 = instance.receiver  

        try:
            chatpreview = ChatPreview.objects.get(
                Q(sender_id=user1.id, receiver_id=user2.id) |

                Q(sender_id=user2.id, receiver_id=user1.id)
            )

            if chatpreview.unread > 0:  # Prevent negative unread count
                chatpreview.unread -= 1
                chatpreview.save()

        except ChatPreview.DoesNotExist:
            print("ChatPreview not found.")
        except Exception as e:
            print("Unexpected error:", e)


@receiver(post_save, sender=Message)
def send_fcm_push_msg(sender, instance, created, **kwargs):
    if created:
        # Delay to let the user possibly mark it as read
        time.sleep(30) 

        # Re-query the message to get the latest state
        fresh_instance = Message.objects.get(id=instance.id)
        if fresh_instance.read:
            print(f"Message {instance.id} already read, skipping push")
            return

        try:
            receiver = fresh_instance.receiver
            sender_user = fresh_instance.sender
            user_id = receiver.id
            subject = "New Message"
            message = fresh_instance.content
            url = f"https://{os.getenv('JALE_DYNAMIC_URL')}/chat/{sender_user.id}"

            # Send notification
            send_notification(user_id, subject, message, url)
            print({'status': 'Notification task queued'})
        except Exception as e:
            print({'error': str(e)}, status=400)
