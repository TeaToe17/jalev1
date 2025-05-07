from django.urls import path
from .views import UserFCMTokenView, delete_fcm_token_view, ListMessagesView, CreateUserView, CreateChatRoom, ListChatPreview, UserProfileView, send_message_push_notification

urlpatterns = [
    path("create_user/", CreateUserView.as_view(), name="create_user"),
    path("update_user/", UserProfileView.as_view(), name="update_user"),
    path("create_permission_token/", UserFCMTokenView.as_view(), name="create-permission-token"),
    path("delete_permission_token/", delete_fcm_token_view, name="delete-permission-token"),
    path("list_messages/<int:user_id>/", ListMessagesView.as_view(), name="list-messages"),
    path("chatroom/create/", CreateChatRoom.as_view(), name="create-chatroom"),
    path("chatpreview/list/", ListChatPreview.as_view(), name="list-chatpreview"),
    path("push_message/", send_message_push_notification, name="push-message"),
]