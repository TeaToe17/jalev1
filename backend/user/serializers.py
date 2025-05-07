from django.utils.timezone import localtime
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CustomUser, UserFCMToken, Message, ChatRoom, ChatPreview

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "username", "password", "email", "whatsapp", "call"]
        extra_kwargs = {"password":{"write_only":True},}

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user
    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Fetching customer details
        if isinstance(user, CustomUser):
            token['CustomUser'] = {
                'id':user.id,
                'name': user.username,
                'whatsapp': user.whatsapp,
                'call': user.call,
                'categories': list(user.categories.values_list('name', flat=True)),          
                }
        elif user.DoesNotExist:
            token['CustomUser'] = None

        return token
    
class PermissionTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFCMToken
        fields = ["token"]

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["sender", "receiver", "content"]

class ChatRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatRoom
        fields = ["name", "initiator", "initiated"]

class ChatPreviewSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()

    class Meta:
        model = ChatPreview
        fields = ["latest_message", "sender", "receiver", "time"]

    def get_time(self, obj):
        print(obj)
        if hasattr(obj, 'time') and obj.time:
            return localtime(obj.time).strftime('%H:%M')  # 24-hour format
        return None