from django.utils.timezone import localtime
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings

from .models import CustomUser, UserFCMToken, Message, ChatPreview
from product.models import Category

from dotenv import load_dotenv
import os

load_dotenv()



class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(allow_blank=True, required=False)
    password = serializers.CharField(allow_blank=True, required=False, write_only=True)
    referral_points = serializers.IntegerField(default = 0, required=False)
    categories = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), many=True, required=False
    )

    class Meta:
        model = CustomUser
        fields = ["id", "username", "password", "email", "whatsapp", "call", "categories", "referral_points"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        request = self.context.get("request")
        ref = request.query_params.get("ref")
        categories = validated_data.pop("categories", [])
        user = CustomUser.objects.create_user(**validated_data)
        user.categories.set(categories)
        if ref:
            try:
                referrer = CustomUser.objects.get(username = str(ref))
                if referrer:
                    referrer.referral_points += 1
                    referrer.save()
            except Exception as e:
                print("Referral error",e)
        return user

    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Fetching customer details
        if isinstance(user, CustomUser):
            token['CustomUser'] = {
                'id':user.id,
                'username': user.username,
                'whatsapp': user.whatsapp,
                'call': user.call,
                'email': user.email,
                'referral_points':user.referral_points,
                'categories': list(user.categories.values_list('name', flat=True)),          
                }
        return token

    
class PermissionTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFCMToken
        fields = ["token"]

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["sender", "receiver", "content", "timestamp"]

class MessageBooleanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["read"]

class ChatPreviewSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()

    class Meta:
        model = ChatPreview
        fields = ["latest_message", "sender", "receiver", "time", "unread", "actual_sender", "actual_receiver"]

    def get_time(self, obj):
        if hasattr(obj, 'time') and obj.time:
            return localtime(obj.time).strftime('%H:%M')  # 24-hour format
        return None

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = CustomUser.objects.get(email=value)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("No user is associated with this email.")
        return value
    
    def save(self):
        email = self.validated_data['email']
        user = CustomUser.objects.get(email=email)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"https://{os.getenv('JALE_DYNAMIC_URL')}/resetpassword?uid={uid}&token={token}"
        send_mail(
            subject="Password Reset",
            message=f"Click here to reset your password: {reset_url}",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
            fail_silently=False,
        )