from django.contrib import admin
from .models import CustomUser, UserFCMToken, Message, ChatPreview

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    model = CustomUser
    list_display = ('id', 'username', 'email', 'whatsapp', 'call')

@admin.register(UserFCMToken)
class UserFCMTokenAdmin(admin.ModelAdmin):
    model = UserFCMToken
    list_display = ("user", "token", "created_at")
    # list_display = ("user", "token", "created_at")

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    model = Message

@admin.register(ChatPreview)
class ChatPreviewAdmin(admin.ModelAdmin):
    model = ChatPreview
    ordering = ["-time"]