from django.db import models
from django.contrib.auth.models import AbstractUser
import time
import send_email
import threading


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    call = models.CharField(max_length=20, null=True, blank=True)
    categories = models.ManyToManyField("product.Category", related_name="users", blank=True) 
    contact_violation_count = models.PositiveIntegerField(default=0)
    suspension_until = models.DateTimeField(null=True, blank=True)
    is_blacklisted = models.BooleanField(default=False)
    is_suspended = models.BooleanField(default=False)    
    referral_points = models.IntegerField(default=0, blank=True)
    

    def __str__(self):
        return f"{self.id}-{self.username}"

class UserFCMToken(models.Model):
    user = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="fcm_tokens", null=True)
    token = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}-{self.token}-{self.created_at}"

class Message(models.Model):
    sender = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name='sent_messages', null=True)
    receiver = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name='received_messages', null=True)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False, blank=True)


    def save(self, *args, **kwargs):
        print("Save method triggered", self.content)
        if self._state.adding:  # only on create
            self.read = False
        super().save(*args, **kwargs)

        # # Run this after save in a separate thread
        # def delayed_unread_check():
        #     time.sleep(1 * 60)  # sleep for 2 minutes
        #     try:
        #         print("before read")
        #         saved_obj = self.__class__.objects.get(pk=self.pk)
        #         print(saved_obj.read)

        #         if not saved_obj.read:
        #             print("after read")
        #             receiver = saved_obj.receiver
        #             if saved_obj.receiver and saved_obj.content:
        #                 send_email(receiver.email, "You Have an Unread Message", saved_obj.content)
        #     except Message.DoesNotExist:
        #         pass

        # thread = threading.Thread(target=delayed_unread_check)
        # thread.start()


class ChatPreview(models.Model):
    sender = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="sender_previews")
    receiver = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="receiver_previews")
    latest_message = models.CharField(max_length=100)
    time = models.DateTimeField()
    unread = models.IntegerField(default=0, blank=True) 
    actual_sender = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="actual_sender_previews", null=True)
    actual_receiver = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="actual_receiver_previews", null=True)
    

    class Meta:
        ordering = ["-time"]