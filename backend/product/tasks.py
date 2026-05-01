# import os 
# from django.conf import settings

# from django.utils.timezone import now
# from datetime import timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from user.models import PushSubscription
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
    Sends ONE notification per user via WebPush (Apple/Android/Windows).
    Intelligently selects the best available path to avoid duplicate messages.
    """
    logger.info(f"Sending single notification: user_id={user_id}, subject={subject}, message={message}, url={url}")

    try:
        subscriptions = PushSubscription.objects.filter(user__id=user_id)
        if not subscriptions.exists():
            logger.warning(f"No WebPush tokens found for user ID {user_id}")
            return {"status": "FAILED", "error": "No tokens found"}

        notification_sent = False

        for sub in subscriptions:
            try:
                logger.info(f"Sending WebPush notification to user {user_id}")
                payload = {
                    "title": subject,
                    "body": message,
                    "url": url or "",
                    "timestamp": str(int(time.time())),
                }
                # webpush(
                #     subscription_info=user_token.subscription,
                #     data=json.dumps(payload),
                #     vapid_private_key=settings.WEBPUSH_VAPID_PRIVATE_KEY,
                #     vapid_claims=settings.WEBPUSH_VAPID_CLAIMS,
                # )
                webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh, # Fixed: p256dh (not 265)
                        "auth": sub.auth,
                    }
                },
                data=json.dumps(payload),
                vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
                vapid_claims={
                    "sub": "mailto:titobiloluwaa83@gmail.com"
                }
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