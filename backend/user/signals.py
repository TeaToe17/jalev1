from django.dispatch import receiver
from django.db.models.signals import post_save
from django.db.models import Q
from .models import Message, ChatPreview
import time 
import logging
import threading

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Message)
def update_chat_preview(sender, instance, created, **kwargs):
    print("CP")
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
