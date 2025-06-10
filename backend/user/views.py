# views.py
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics
from rest_framework import status 
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from django.http import Http404
from django.db.models import Q, F
from django.contrib.auth.tokens import default_token_generator
from rest_framework.parsers import MultiPartParser
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.http import JsonResponse


from .serializers import CustomTokenObtainPairSerializer, PermissionTokenSerializer, MessageSerializer, UserSerializer, ChatPreviewSerializer, PasswordResetSerializer, MessageBooleanSerializer
from .models import UserFCMToken, Message, CustomUser, ChatPreview
from product.tasks import browser_notify

class CreateUserView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer 
    permission_classes = [AllowAny]

class UserProfileView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        return CustomUser.objects.filter(id=self.request.user.id)
    
class ListUserView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    queryset = CustomUser.objects.all()
    lookup_field = "id"

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
class UserFCMTokenView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PermissionTokenSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            print("🔴 Serializer Errors:", serializer.errors)
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        token_value = serializer.validated_data["token"]
        user = request.user

        # Check for duplication
        if UserFCMToken.objects.filter(user=user, token=token_value).exists():
            print("🟡 Token already exists for user")
            return Response({"message": "Token already exists for user"}, status=status.HTTP_200_OK)

        # Save if not duplicate
        serializer.save(user=user)
        print("✅ Token saved for user")
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_fcm_token_view(request):
    """Delete the FCM token for the authenticated user."""
    
    token = UserFCMToken.objects.filter(user=request.user).first()
    
    if token:
        token.delete()
        return Response({"message": "Token deleted successfully"}, status=200)
    
    raise Http404("FCM Token not found")

class ListMessagesView(generics.ListAPIView):
    # serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        # Get messages between the authenticated user and user_id
        # filter properly
        messages = Message.objects.filter(
            Q(sender_id=request.user.id, receiver_id=user_id) |
            Q(sender_id=user_id, receiver_id=request.user.id)
        ).order_by('timestamp')
        # print("Messages:",messages)
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

class ListChatPreview(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatPreviewSerializer

    def get_queryset(self):
        return ChatPreview.objects.filter(
            Q(sender=self.request.user) | Q(receiver=self.request.user)       
            ).distinct()

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message_push_notification(request):
    try:
        user_Id = request.data.get("receiverId")
        subject = "New Message"
        message = request.data.get("message")
        # url = str(f"https://localhost:3000/chat/{request.data.get('senderId')}")
        url = str(f"https://jale.vercel.app/chat/{request.data.get('senderId')}")


        # This task is loacted in product.task because its also used for Products
        browser_notify(user_Id, subject, message, url)
        return Response({'status': 'Notification task queued'})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

class PasswordResetView(generics.CreateAPIView):
    serializer_class = PasswordResetSerializer
    permission_classes = [AllowAny]  # Required for public access

class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = [AllowAny]  # Required for public access
    parser_classes = [MultiPartParser]  # Only if using FormData

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('password')

        print(uidb64,token,new_password)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            print("Decoded UID:", uid)
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist) as e:
            print("Invalid UID:", e)
            return Response({'error': 'Invalid UID'}, status=400)

        if default_token_generator.check_token(user, token):
            print("valid Token")
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password has been reset successfully'})
        return Response({'error': 'Invalid or expired token'}, status=400)
    
class UpdatedMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        user1 = request.user
        try:
            user2 = CustomUser.objects.get(id=id)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        messages = Message.objects.filter(
            Q(sender=user1, receiver=user2) | Q(sender=user2, receiver=user1),
            read=False
        )

        updated_count = 0
        for message in messages:
            message.read = True
            message.save()  # This triggers signals
            updated_count += 1

        return Response({"updated_count": updated_count}, status=200)

def cron_view(request):
    return JsonResponse({'status': 'ok'})