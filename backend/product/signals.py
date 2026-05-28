# signals.py - FIXED VERSION
from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from django.db import transaction
import threading
import logging

from .tasks import send_email, browser_notify
from .models import Product
from user.models import CustomUser

logger = logging.getLogger(__name__)


def notify_users_on_new_product(sender, instance, action, **kwargs):
    if action == "post_add":
        transaction.on_commit(lambda: process_notifications_async(instance))


def process_notifications_async(instance):
    """Run notification processing in background thread after DB commit"""
    threading.Thread(
        target=send_product_notifications,
        args=(instance.id,),
        daemon=True
    ).start()


def send_product_notifications(product_id):
    """Send notifications for a product (category users + request owner)"""

    try:
        # Load product safely (DO NOT assume request exists)
        product = (
            Product.objects
            .select_related("request__owner", "owner")
            .prefetch_related("categories")
            .get(id=product_id)
        )

        # Freeze values BEFORE thread-heavy logic (prevents ORM lazy crashes)
        product_name = product.name
        product_id = product.id
        categories = list(product.categories.all())

        request_owner = None
        request_obj = getattr(product, "request", None)

        if request_obj and getattr(request_obj, "owner", None):
            request_owner = request_obj.owner

        # Get interested users (same logic as before)
        interested_users = (
            CustomUser.objects
            .filter(categories__in=categories)
            .distinct()
            .values("id", "email")
        )

        print(f"Found {len(interested_users)} interested users")

        subject = "New product Posted"
        subject2 = "New Product Posted : Browser"
        message = f"Just in! \n {product_name}"
        url = f"https://jale.vercel.app/product/{product_id}"

        # CATEGORY NOTIFICATIONS (unchanged behavior)
        for user_data in interested_users:
            try:
                browser_notify(
                    user_data["id"],
                    subject2,
                    message,
                    url
                )
            except Exception as e:
                print(f"Failed to notify user {user_data['id']}: {e}")

        # REQUEST OWNER NOTIFICATION (SAFE VERSION)
        if request_owner:
            try:
                request_message = f"{product_name} was just uploaded, Here: {url}"

                send_email(
                    request_owner.email,
                    "Requested Product Uploaded",
                    request_message
                )

                browser_notify(
                    request_owner.id,
                    "Requested Product Uploaded",
                    product_name,
                    url
                )

            except Exception as e:
                print(f"Failed to notify request owner: {e}")

    except Exception as e:
        print(f"Error in send_product_notifications: {e}")


# # signals.py - CORRECTED VERSION
# from django.db.models.signals import post_save, m2m_changed
# from django.dispatch import receiver
# from django.db import transaction
# import threading

# from .tasks import send_email, browser_notify
# from .models import Product
# from user.models import CustomUser
# from user.models import Message
# import time
# import logging

# logger = logging.getLogger(__name__)


# # @receiver(m2m_changed, sender=Product.categories.through)
# def notify_users_on_new_product(sender, instance, action, **kwargs):
#     if action == "post_add":
#         # Use transaction.on_commit to ensure this runs after the transaction
#         transaction.on_commit(lambda: process_notifications_async(instance))

# def process_notifications_async(instance):
#     """Process notifications in a separate thread after transaction commits"""
#     threading.Thread(target=send_product_notifications, args=(instance.id,)).start()

# def send_product_notifications(product_id):
#     """Send notifications for a product - runs in background thread"""
#     try:
#         # Get product with related data in one query
#         product = Product.objects.select_related('request__owner').prefetch_related(
#             'categories'
#         ).get(id=product_id)
        
#         # Get all users interested in these categories (optimized query)
#         interested_users = CustomUser.objects.filter(
#             categories__in=product.categories.all()
#         ).distinct().values('id', 'email')
        
#         print(f"Found {len(interested_users)} interested users")
        
#         # Prepare notification data
#         subject = "New product Posted"
#         subject2 = "New Product Posted : Browser"
#         message = f"Just in! \n {product.name}"
#         url = f"https://jale.vercel.app/product/{product.id}"
        
#         # Send notifications to interested users
#         for user_data in interested_users:
#             try:
#                 # Send browser notification
#                 browser_notify(user_data['id'], subject2, message, url)
#             except Exception as e:
#                 print(f"Failed to notify user {user_data['id']}: {e}")
        
#         # Handle request owner notification
#         if product.request and product.request.owner:
#             try:
#                 request_message = f"{product.name} was just uploaded, Here: {url}"
#                 send_email(
#                     product.request.owner.email, 
#                     "Requested Product Uploaded", 
#                     request_message
#                 )
#                 print("Product name:",product.name)
#                 browser_notify(
#                     product.request.owner.id,
#                     "Requested Product Uploaded", 
#                     product.name, 
#                     url
#                 )
#             except Exception as e:
#                 print(f"Failed to notify request owner: {e}")
                
#     except Exception as e:
#         print(f"Error in send_product_notifications: {e}")