from django.contrib import admin
from .models import CustomUser, Message, ChatPreview, PushSubscription, FlaggedMessage

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    model = CustomUser
    list_display = ('id', 'username', 'email', 'whatsapp', 'call')

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    model = Message
    ordering=["-timestamp"]

@admin.register(ChatPreview)
class ChatPreviewAdmin(admin.ModelAdmin):
    model = ChatPreview
    ordering = ["-time"]

@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    model = PushSubscription
    list_display = ("user","endpoint", "p256dh", "auth", "creation_date")

@admin.register(FlaggedMessage)
class FlaggedMessageAdmin(admin.ModelAdmin):
    model = FlaggedMessage
    list_display = ("text","created_at",)