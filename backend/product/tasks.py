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
    Sends ONE notification per user via FCM (Android/Chrome) or WebPush (Apple/Safari).
    Intelligently selects the best available path to avoid duplicate messages.
    
    Priority:
    1. FCM (most reliable for Android/Chrome)
    2. WebPush fallback (for Safari/iOS)
    """
    logger.info(f"Sending single notification: user_id={user_id}, subject={subject}, message={message}, url={url}")

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

        notification_sent = False

        for user_token in user_tokens:
            # Try FCM first (best for Android/Chrome)
            if user_token.token:
                try:
                    logger.info(f"Sending FCM notification to user {user_id}")
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
                    notification_sent = True
                    break  # Exit after successful send - only send ONE notification

                except messaging.UnregisteredError:
                    logger.warning(f"Unregistered FCM token, removing: {user_token.token}")
                    user_token.delete()
                except Exception as e:
                    logger.error(f"Error sending FCM notification: {e}")
                    # Continue to next token if FCM fails

            if not notification_sent and user_token.subscription:
                try:
                    logger.info(f"Sending WebPush notification to user {user_id} (FCM unavailable)")
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
                    logger.info("WebPush notification sent successfully")
                    notification_sent = True
                    break  # Exit after successful send - only send ONE notification

                except WebPushException as e:
                    logger.error(f"WebPush failed for user {user_id}: {repr(e)}")
                except Exception as e:
                    logger.error(f"Unexpected WebPush error: {e}", exc_info=True)

        return {
            "status": "SENT" if notification_sent else "FAILED",
            "subject": subject,
            "sent": notification_sent,
            "method": "FCM" if notification_sent else "N/A",
        }

    except Exception as e:
        logger.error(f"Unexpected error in browser_notify: {e}", exc_info=True)
        return {"status": "FAILED", "error": str(e)}