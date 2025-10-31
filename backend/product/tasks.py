# import os 
# from django.conf import settings

# from django.utils.timezone import now
# from datetime import timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from user.models import UserFCMToken
from firebase_admin import get_app, messaging
from dotenv import load_dotenv
from django.conf import settings
from pywebpush import webpush, WebPushException
import time, json, logging, smtplib, os


load_dotenv()

def send_email(to_email, subject, message):
    from_email = "jale.official.contact@gmail.com"
    password = os.getenv("EMAIL_HOST_PASSWORD")  # Use app-specific password here
    
    # Set up the MIME
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(message, 'plain'))

    try:
        # Connect to the server and send the email
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(from_email, password)
            server.send_message(msg)
        print("Email sent successfully")
        logger.info(f"Sent email Succesfully to {to_email}")
        return {
            "status": "SENT",
            "receiver": to_email,
            "subject": subject,
        }        
    except Exception as e:
        print(f"Failed to send email: {e}")
        logger.info(f"Sent email Succesfully to {to_email}")
        return {
            "status": "FAILED",
            "receiver": to_email,
            "subject": subject,
        }  
    
logger = logging.getLogger(__name__)

def browser_notify(user_id, subject, message, url):
    """
    Sends notification to user via Firebase (FCM) or WebPush (Apple/Safari).
    Automatically detects token type.
    Sequential execution; failures in one path don't block the other.
    """
    logger.info(f"Sending notification: user_id={user_id}, subject={subject}, message={message}, url={url}")

    try:
        app = get_app()
        logger.info(f"Firebase Admin app initialized: {app.name}")
    except ValueError as e:
        logger.error(f"Firebase Admin not initialized: {e}")
        return {"status": "FAILED", "error": "Firebase not initialized"}

    try:
        user_tokens = UserFCMToken.objects.filter(user__id=user_id)
        if not user_tokens.exists():
            logger.warning(f"No FCM/WebPush tokens found for user ID {user_id}")
            return {"status": "FAILED", "error": "No tokens found"}

        successful_sends = 0
        failed_sends = 0

        for user_token in user_tokens:
            sent = False  # track success per token entry

            # -------------------------
            # Safari / WebPush path
            # -------------------------
            if user_token.subscription:
                try:
                    logger.info(f"Sending WebPush to user {user_id}")
                    payload = {
                        "title": subject,
                        "body": message,
                        "url": url or "",
                        "timestamp": str(int(time.time())),
                    }
                    webpush(
                        subscription_info=user_token.subscription,
                        data=json.dumps(payload),
                        vapid_private_key=settings.WEBPUSH_VAPID_PRIVATE_KEY,
                        vapid_claims=settings.WEBPUSH_VAPID_CLAIMS,
                    )
                    successful_sends += 1
                    sent = True
                except WebPushException as e:
                    logger.error(f"WebPush failed for user {user_id}: {repr(e)}")
                    failed_sends += 1
                except Exception as e:
                    logger.error(f"Unexpected WebPush error: {e}", exc_info=True)
                    failed_sends += 1

            # -------------------------
            # FCM path (Android / Chrome)
            # -------------------------
            if user_token.token:
                try:
                    message_obj = messaging.Message(
                        notification=messaging.Notification(
                            title=subject,
                            body=message,
                            image=url if url and url.endswith(('.jpg', '.png', '.gif')) else None,
                        ),
                        data={
                            "title": subject,
                            "body": message,
                            "url": url or "",
                            "timestamp": str(int(time.time())),
                            "click_action": url or "",
                        },
                        webpush=messaging.WebpushConfig(
                            notification=messaging.WebpushNotification(
                                title=subject,
                                body=message,
                                icon="/logo.png",
                                badge="/badge-icon.png",
                                tag="notification-tag",
                                require_interaction=True,
                                actions=[
                                    messaging.WebpushNotificationAction(action="open", title="Open"),
                                    messaging.WebpushNotificationAction(action="close", title="Close"),
                                ],
                                data={"url": url or "", "timestamp": str(int(time.time()))},
                            ),
                            fcm_options=messaging.WebpushFCMOptions(link=url),
                        ),
                        token=user_token.token,
                    )

                    response = messaging.send(message_obj)
                    logger.info(f"FCM notification sent successfully: {response}")
                    successful_sends += 1
                    sent = True

                except messaging.UnregisteredError:
                    logger.warning(f"Unregistered FCM token, removing: {user_token.token}")
                    user_token.delete()
                    failed_sends += 1
                except Exception as e:
                    logger.error(f"Error sending FCM notification: {e}", exc_info=True)
                    failed_sends += 1

            if not sent:
                logger.warning(f"No valid send path succeeded for token entry: {user_token.id}")

        return {
            "status": "SENT" if successful_sends > 0 else "FAILED",
            "subject": subject,
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
            "total_tokens": user_tokens.count(),
        }

    except Exception as e:
        logger.error(f"Unexpected error in browser_notify: {e}", exc_info=True)
        return {"status": "FAILED", "error": str(e)}