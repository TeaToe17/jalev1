from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    email = models.EmailField(blank=True, null=True)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    call = models.CharField(max_length=20, null=True, blank=True)
    categories = models.ManyToManyField("product.Category", related_name="users") 
    contact_violation_count = models.PositiveIntegerField(default=0)
    suspension_until = models.DateTimeField(null=True, blank=True)
    is_blacklisted = models.BooleanField(default=False)
    is_suspended = models.BooleanField(default=False)    
    

    def __str__(self):
        return f"{self.id}-{self.username}"

class UserFCMToken(models.Model):
    user = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="fcm_tokens", null=True)
    token = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Message(models.Model):
    sender = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name='sent_messages', null=True)
    receiver = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name='received_messages', null=True)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

class ChatRoom(models.Model):
    roomname = models.CharField(max_length=30)
    initiator = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="initiator_chatrooms", null=True)
    initiated = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="initiated_chatrooms", null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class ChatPreview(models.Model):
    sender = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="sender_previews")
    receiver = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="receiver_previews")
    latest_message = models.CharField(max_length=100)
    time = models.DateTimeField()