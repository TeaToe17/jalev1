# signals.py
from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
# from webpush import send_group_notification

from .tasks import send_email, browser_notify
from .models import Product
from user.models import CustomUser

# @receiver(post_save, sender=Product)
# def schedule_product_deletion(sender, instance, **kwargs):

#     if instance.sold and instance.datesold:
#         # Schedule the deletion task to run after 7 days (604800 seconds)
#         product = get_object_or_404(sender, id = instance.id)
#         task = delete_product_after_7_days.apply_async(args=[instance.id], countdown=604800)
#         # delete_product_after_7_days.apply_async((instance.id,), countdown=604800)
#         return JsonResponse({
#             "task_name": f"Task {task.id} scheduled to delete product '{product.name}'",
#             "task_id": task.id,
#         })

# processed_products = set()


@receiver(m2m_changed, sender=Product.categories.through)
def notify_users_on_new_product(sender, instance, action, **kwargs):
    # Ensure action is 'post_add' to capture when categories are fully updated
    if action == "post_add":
        users = set(CustomUser.objects.filter(categories__in=instance.categories.all()).distinct())

        print(f"product categories: {instance.categories.all()}")
        print(f"Category interested users: {users}")

        if not users:
            print("No users found for these categories:", instance.categories.all())

        for user in users:
            print("User:",user)
            subject = "New product Posted"
            subject2 = "New Product Posted : Browser"
            message = f"Just in! \n {instance.name}"
            user_Id = user.id
            url = f"https://localhost:3000/product/{instance.id}"
            send_email(user.email, subject, message)
            browser_notify(user_Id, subject2, message, str(url))

        