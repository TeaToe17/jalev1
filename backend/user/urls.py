from django.urls import path
from .views import UserFCMTokenView, delete_fcm_token_view, ListMessagesView, CreateUserView, ListChatPreview, UserProfileView, send_message_push_notification, PasswordResetView, PasswordResetConfirmView, UpdatedMessagesView, ListUserView, MessageRemindView, cron_view, RetrieveUserPermToken

urlpatterns = [
    path("create_user/", CreateUserView.as_view(), name="create-user"),
    path("update_user/<int:id>/", UserProfileView.as_view(), name="update-user"),
    path("get_user/<int:id>/",ListUserView.as_view(), name="get_user"),
    path("create_permission_token/", UserFCMTokenView.as_view(), name="create-permission-token"),
    path("retrieve_permission_token/<int:user_id>", RetrieveUserPermToken.as_view(), name="retrieve-permission-token"),
    path("delete_permission_token/", delete_fcm_token_view, name="delete-permission-token"),
    path("list_messages/<int:user_id>/", ListMessagesView.as_view(), name="list-messages"),
    path("push_message/", send_message_push_notification, name="push-message"),
    path("update_messages/<int:id>/", UpdatedMessagesView.as_view(), name = "update-messages"),
    path("chatpreview/list/", ListChatPreview.as_view(), name="list-chatpreview"),
    path('message_reminder/', MessageRemindView.as_view(), name='message-reminder'),

    path('password_reset/', PasswordResetView.as_view(), name='password-reset'),
    path('password_reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    path("cron_view/", cron_view, name="cron-view"),
]