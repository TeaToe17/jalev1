# views.py
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics
from rest_framework import status 
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.http import Http404
from django.db.models import Q

from .serializers import CustomTokenObtainPairSerializer, PermissionTokenSerializer, MessageSerializer, UserSerializer, ChatRoomSerializer, ChatPreviewSerializer
from .models import UserFCMToken, Message, CustomUser, ChatRoom, ChatPreview
from product.tasks import browser_notify

class CreateUserView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer 
    permission_classes = [AllowAny]

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user  # Only allows access to their own data


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
    
class CreateChatRoom(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatRoomSerializer

    def create(self, request, *args, **kwargs):
        existing_rooms = ChatRoom.objects.all()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room_name = serializer.validated_data.get("roomname")
        if not existing_rooms.filter(roomname=room_name).exists():
            serializer.save()
        else:
            return Response("Room Already created")
    
class ListChatRoom(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatRoomSerializer

    def get(self):
        pass

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
        url = str(f"https://localhost:3000/chat/{request.data.get('senderId')}")


        # create another signal or task that doesnt send based on category
        browser_notify(user_Id, subject, message, url)
        return Response({'status': 'Notification task queued'})
    except Exception as e:
        return Response({'error': str(e)}, status=400)