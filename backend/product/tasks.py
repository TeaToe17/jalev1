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
    Enhanced notification function with better error handling and payload structure
    """
    logger.info(f"Sending notification: user_id={user_id}, subject={subject}, message={message}, url={url}")
    
    # Firebase initialization check
    try:
        app = get_app()
        logger.info(f"Firebase Admin app initialized: {app.name}")
    except ValueError as e:
        logger.error(f"Firebase Admin not initialized: {e}")
        return {
            "status": "FAILED",
            "error": "Firebase not initialized"
        }
    
    try:        
        tokens = UserFCMToken.objects.filter(user__id=user_id).values_list('token', flat=True)
        
        if not tokens:
            logger.warning(f"No FCM tokens found for user ID {user_id}")
            return {
                "status": "FAILED",
                "error": "No FCM tokens found"
            }
        
        successful_sends = 0
        failed_sends = 0
        
        for user_token in tokens:
            try:
                # Create message with both notification and data payloads
                message_obj = messaging.Message(
                    # Notification payload - shows even when app is closed
                    notification=messaging.Notification(
                        title=subject,
                        body=message,
                        image=url if url and url.endswith(('.jpg', '.png', '.gif')) else None
                    ),
                    # Data payload - available in service worker
                    data={
                        "title": subject,
                        "body": message,
                        "url": url or "",
                        "timestamp": str(int(time.time())),
                        "click_action": url or ""
                    },
                    # Web push specific options
                    webpush=messaging.WebpushConfig(
                        notification=messaging.WebpushNotification(
                            title=subject,
                            body=message,
                            icon="/logo.png",
                            badge="/badge-icon.png",
                            tag="notification-tag",
                            require_interaction=True,
                            actions=[
                                messaging.WebpushNotificationAction(
                                    action="open",
                                    title="Open"
                                ),
                                messaging.WebpushNotificationAction(
                                    action="close", 
                                    title="Close"
                                )
                            ],
                            data={
                                "url": url or "",
                                "timestamp": str(int(time.time()))
                            }
                        ),
                        fcm_options=messaging.WebpushFCMOptions(
                            link=url
                        )
                    ),
                    token=user_token
                )
                
                response = messaging.send(message_obj)
                logger.info(f"Notification sent successfully: {response}")
                successful_sends += 1
                
            except messaging.UnregisteredError:
                logger.warning(f"Token is unregistered, removing: {user_token}")
                # Remove invalid token from database
                UserFCMToken.objects.filter(token=user_token).delete()
                failed_sends += 1
                
            except messaging.InvalidArgumentError as e:
                logger.error(f"Invalid argument for token {user_token}: {e}")
                failed_sends += 1
                
            except Exception as e:
                logger.error(f"Error sending to token {user_token}: {e}")
                failed_sends += 1
        
        return {
            "status": "SENT" if successful_sends > 0 else "FAILED",
            "subject": subject,
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
            "total_tokens": len(tokens)
        }
        
    except Exception as e:
        logger.error(f"Error in browser_notify: {e}", exc_info=True)
        return {
            "status": "FAILED",
            "subject": subject,
            "error": str(e)
        }