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


# def delete_product_after_7_days():
#     Product = apps.get_model("product", "Product")
#     products = Product.objects.filter(sold=True, datesold__isnull=False)
#     for product in products:
#         logger.info(f"Task running for Product ID: {product.id}")
#         logger.info(f"Product sold: {product.sold}, Date sold: {product.datesold}, Now: {now()}")

#         if now() >= (product.datesold + timedelta(days=7)):
#             logger.info(f"Deleted product with ID: {product.id} and Name: {product.name}")
#             product.delete()
#         else:
#             logger.info(f"Product not eligible for deletion: {product.name} (ID: {product.id})")


def send_email(self, to_email, subject, message):
    from_email = "titobiloluwaa83@gmail.com"
    password = "xzkf nbzv wtro mjiw"  # Use app-specific password here
    
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
        self.update_state(state="SUCCESS",meta={"task_name":f"Send email to {to_email}"})
        return {
            "status": "SENT",
            "receiver": to_email,
            "subject": subject,
        }        
    except Exception as e:
        print(f"Failed to send email: {e}")
        logger.info(f"Sent email Succesfully to {to_email}")
        self.update_state(state="FAILURE",meta={"task_name":f"Send email to {to_email}"})
        return {
            "status": "FAILED",
            "receiver": to_email,
            "subject": subject,
        }  
    


logger = logging.getLogger(__name__)


def browser_notify(user_Id, subject, message, url):
    logger.info(f"Check here: user_Id={user_Id}, subject={subject}, message={message}, url={url}")

    # Firebase initialization sanity check
    try:
        # from firebase_admin import get_app
        app = get_app()
        logger.info(f"Firebase Admin app initialized: {app.name}")
    except ValueError as e:
        logger.error(f"Firebase Admin not initialized: {e}")
        return {
            "status": "FAILED",
            "error": "Firebase not initialized"
        }

    try:
        tokens = UserFCMToken.objects.filter(user__id=user_Id).values_list('token', flat=True)

        for userToken in tokens:
            message_obj = messaging.Message(
                data={
                    "customtitle": subject,
                    "custombody": message,
                    "url": url
                },
                token=userToken
            )
            response = messaging.send(message_obj)


        logger.info(f"Notification Sent: {response}")

        return {
            "status": "SENT",
            "subject": subject,
        }

    except UserFCMToken.DoesNotExist:
        logger.warning(f"No FCM token found for user ID {user_Id}")
        return {
            "status": "FAILED",
            "subject": subject,
        }

    except Exception as e:
        logger.error(f"Error sending notification: {e}", exc_info=True)
        return {
            "status": "FAILED",
            "subject": subject,
        }