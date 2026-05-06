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
from dotenv import load_dotenv
from django.utils import timezone
import os, time, threading, ast, json, logging


from .serializers import CustomTokenObtainPairSerializer , MessageSerializer, UserSerializer, ChatPreviewSerializer, PasswordResetSerializer, MessageBooleanSerializer
from .models import Message, CustomUser, ChatPreview, PushSubscription
from product.tasks import browser_notify

load_dotenv()

logger = logging.getLogger(__name__)


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

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_webpush_token_view(request):
    """Delete the WebPush token for the authenticated user."""
    
    token = PushSubscription.objects.filter(user=request.user).first()
    if token:
        token.delete()
        return Response({"message": "Token deleted successfully"}, status=200)
    
    raise Http404("Webpush Token not found")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_subscription(request):
    try:
        data = json.loads(request.body)
        subscription = data.get("subscription", {})

        endpoint = subscription.get("endpoint")
        keys = subscription.get("keys", {})
        p256dh = keys.get("p256dh")
        auth = keys.get("auth")

        # 🔍 Basic validation
        if not endpoint or not p256dh or not auth:
            logger.warning(f"[SAVE_SUB] Missing fields from user={request.user.id}")
            return JsonResponse({
                "status": "error",
                "message": "Invalid subscription data"
            }, status=400)

        logger.info(f"[SAVE_SUB] User={request.user.id}")
        logger.info(f"[SAVE_SUB] Endpoint={endpoint}")  # log full once for debugging
        logger.info(f"[SAVE_SUB] p256dh={p256dh[:20]}...")
        logger.info(f"[SAVE_SUB] auth={auth[:20]}...")

        # 🔍 Count before
        before_count = PushSubscription.objects.filter(user=request.user).count()
        logger.info(f"[SAVE_SUB] Total subs BEFORE = {before_count}")

        sub, created = PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={
                "p256dh": p256dh,
                "auth": auth,
                "creation_date": timezone.now()
            }
        )

        action = "CREATED" if created else "UPDATED"
        logger.info(f"[SAVE_SUB] {action} subscription ID={sub.id}")

        # 🔍 Count after
        after_count = PushSubscription.objects.filter(user=request.user).count()
        logger.info(f"[SAVE_SUB] Total subs AFTER = {after_count}")

        return JsonResponse({
            "status": "success",
            "action": action.lower(),
            "subscription_id": sub.id,
            "total_now": after_count
        })

    except Exception as e:
        logger.exception("[SAVE_SUB] ERROR occurred")
        return JsonResponse({
            "status": "error",
            "error": str(e)
        }, status=500)

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

from django.db.models.signals import post_save

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
            print("It was me")
            message.read = True
            message.save()  # This triggers signals
            updated_count += 1

        return Response({"updated_count": updated_count}, status=200)
    
class MessageRemindView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        incoming_message = request.data.get("message")
        receiver_id = request.data.get("receiver_id")

        def delayed_email_check(incoming_message, receiver_id):
            receiver = CustomUser.objects.get(id=receiver_id)
            msg = Message.objects.filter(
                content=incoming_message,
                receiver_id=receiver.id,
            ).order_by("-timestamp").first()

            time.sleep(5 * 60)
            try:
                msg = Message.objects.filter(id=msg.id).first()
                if msg and not msg.read:
                    browser_notify(receiver.id, "You have an unread message", msg.content, str(f"https://{os.getenv('JALE_DYNAMIC_URL')}/chat/{msg.sender.id}"))
            except Exception as e:
                print(f"Error in push notification sending: {e}")

        threading.Thread(target=delayed_email_check, args=(incoming_message, receiver_id)).start()

        return Response({"message": "Reminder scheduled"}, status=202)

class GetSubAndCheckMsg(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        receiver_id = request.data.get("receiverId")
        msg = request.data.get("body")
        senderId = int(request.data.get("userId"))

        print(msg)

        actual_msg = (
            Message.objects.filter(
                content=msg,
                receiver__id=receiver_id,
                sender__id=senderId
            )
            .order_by('-timestamp', '-id')
            .first()
        )

        print(actual_msg)
        print(actual_msg.timestamp)

        if not actual_msg:
            print("got here")
            return Response({"detail": "Message does not exist because it was intentionally flagged"}, status=200)

        if actual_msg.read:
            print(f"Skipping push - Message {actual_msg.id} has already been read")
            return Response({"detail": "Message already read"}, status=200)

        # Get subscriptions
        tokens = PushSubscription.objects.filter(user__id=receiver_id)
        raw_subs = list(tokens.values_list("subscription", flat=True))

        subscriptions = []
        for sub in raw_subs:
            try:
                if isinstance(sub, dict):
                    subscriptions.append(sub)
                else:
                    parsed = ast.literal_eval(sub)
                    subscriptions.append(parsed)
            except Exception as e:
                print("Invalid subscription format:", sub, e)

        return Response(subscriptions)

def cron_view(request):
    return JsonResponse({'status': 'ok'})