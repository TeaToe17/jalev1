# import os 
# from django.conf import settings

# from django.utils.timezone import now
# from datetime import timedelta
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
# from django.apps import apps
from user.models import UserFCMToken
from firebase_admin import get_app, messaging
from firebase_admin.exceptions import FirebaseError
import os
from dotenv import load_dotenv
from django.conf import settings
import time


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
    Sends a browser push notification using Firebase Cloud Messaging (FCM).
    Includes both notification and data payloads for reliability.
    Retries with a data-only message if the notification payload fails.
    """

    logger.info(f"[browser_notify] Sending notification: user_id={user_id}, subject={subject}, url={url}")

    # Step 1: Check Firebase initialization
    try:
        app = get_app()
        logger.info(f"[browser_notify] Firebase Admin initialized: {app.name}")
    except ValueError as e:
        logger.error(f"[browser_notify] Firebase not initialized: {e}")
        return {"status": "FAILED", "error": "Firebase not initialized"}

    try:
        tokens = UserFCMToken.objects.filter(user__id=user_id).values_list("token", flat=True)
        if not tokens:
            logger.warning(f"[browser_notify] No FCM tokens found for user ID {user_id}")
            return {"status": "FAILED", "error": "No FCM tokens found"}

        successful_sends = 0
        failed_sends = 0

        for user_token in tokens:
            try:
                # Step 2: Main notification message (with visual notification)
                message_obj = messaging.Message(
                    notification=messaging.Notification(
                        title=subject,
                        body=message,
                        image=url if url and url.endswith((".jpg", ".png", ".gif")) else None
                    ),
                    data={
                        "title": subject,
                        "body": message,
                        "url": url or "",
                        "timestamp": str(int(time.time())),
                        "click_action": url or "",
                    },
                    webpush=messaging.WebpushConfig(
                        headers={
                            "Urgency": "high",  # High priority to wake Android Chrome
                            "TTL": "3600"       # Time-to-live = 1 hour
                        },
                        notification=messaging.WebpushNotification(
                            title=subject,
                            body=message,
                            icon="/logo.png",
                            badge="/badge-icon.png",
                            require_interaction=True,
                            tag="notification-tag",
                            actions=[
                                messaging.WebpushNotificationAction(action="open", title="Open"),
                                messaging.WebpushNotificationAction(action="close", title="Close"),
                            ],
                            data={
                                "url": url or "",
                                "timestamp": str(int(time.time()))
                            },
                        ),
                        fcm_options=messaging.WebpushFCMOptions(link=url)
                    ),
                    token=user_token,
                )

                response = messaging.send(message_obj)
                logger.info(f"[browser_notify] Notification sent successfully: {response}")
                successful_sends += 1

            except (messaging.UnregisteredError, messaging.InvalidArgumentError) as e:
                logger.warning(f"[browser_notify] Invalid or unregistered token ({user_token}): {e}")
                UserFCMToken.objects.filter(token=user_token).delete()
                failed_sends += 1

            except FirebaseError as e:
                logger.error(f"[browser_notify] FirebaseError sending to {user_token}: {e}")
                failed_sends += 1

            except Exception as e:
                logger.error(f"[browser_notify] Error sending to {user_token}: {e}", exc_info=True)
                failed_sends += 1

                # Step 3: Fallback – retry with data-only message (for devices ignoring notification payload)
                try:
                    fallback_msg = messaging.Message(
                        data={
                            "title": subject,
                            "body": message,
                            "url": url or "",
                            "timestamp": str(int(time.time())),
                            "click_action": url or "",
                            "fallback": "true",
                        },
                        webpush=messaging.WebpushConfig(
                            headers={
                                "Urgency": "high",
                                "TTL": "3600"
                            },
                            fcm_options=messaging.WebpushFCMOptions(link=url)
                        ),
                        token=user_token,
                    )

                    fallback_response = messaging.send(fallback_msg)
                    logger.info(f"[browser_notify] Fallback data-only message sent: {fallback_response}")
                    successful_sends += 1
                except Exception as fallback_error:
                    logger.error(f"[browser_notify] Fallback send failed: {fallback_error}")
                    failed_sends += 1

        status = "SENT" if successful_sends > 0 else "FAILED"
        return {
            "status": status,
            "subject": subject,
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
            "total_tokens": len(tokens),
        }

    except Exception as e:
        logger.error(f"[browser_notify] General error: {e}", exc_info=True)
        return {"status": "FAILED", "subject": subject, "error": str(e)}