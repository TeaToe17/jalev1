from django.dispatch import receiver
from django.db.models.signals import post_save
from django.db.models import Q
from user.models import Message, ChatPreview
import time 
import logging
import threading
import os
from product.tasks import browser_notify



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


# @receiver(post_save, sender=Message)
# def send_fcm_push_msg(sender, instance, created, **kwargs):
#     if created and not instance.read:
#         print("passed conditionals") 
#         receiver = instance.receiver
#         sender = instance.sender
#         try:
#             user_Id = receiver.id
#             subject = "New Message"
#             message = instance.content
#             url = str(f"https://{os.getenv('JALE_DYNAMIC_URL')}/chat/{sender.id}")


#             # This task is loacted in product.task because its also used for Products
#             browser_notify(user_Id, subject, message, url)            
#             print({'status': 'Notification task queued'})
#         except Exception as e:
#             return print({'error': str(e)}, status=400)