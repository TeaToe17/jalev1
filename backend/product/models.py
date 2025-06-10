from django.db import models
from django.utils.timezone import now

import math
from decimal import Decimal

from .tasks import send_email

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=5, null=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=50, null = True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=1)
    categories = models.ManyToManyField("product.Category", related_name="category_products")
    imagefile = models.ImageField(upload_to="products_images/", blank=True, null=True)  # Write images in form of file to this field
    image = models.URLField(blank=True, null=True)  # Read images in form of cloudinary URLS from this field
    used = models.BooleanField(default=False)
    extra_field = models.JSONField(default=dict, blank=True, null=True)
    created = models.DateField(auto_now_add=True, null=True)
    owner = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="products", null=True)
    request = models.ForeignKey("request.Request", on_delete=models.SET_NULL, related_name="requested_products", null=True, blank=True)
    sold = models.BooleanField(default=False)
    negotiable = models.BooleanField(default=False)
    datesold = models.DateTimeField(blank=True, null=True)
    is_sticky = models.BooleanField(default=False)
    sticky_timestamp = models.DateTimeField(null=True, blank=True)
    reserved = models.BooleanField(default=False)


    def save(self, *args, **kwargs):
        
        # Reverting sold and reserved status when quantity is updated 
        if self.pk:
            if self.stock > 0:
                self.sold = False
                self.reserved = False

        # # Increase owner_price by 20%
        # increased_price = self.price * Decimal('1.2')
        
        # # Round up to the nearest 500
        # rounded_price = math.ceil(increased_price / 100) * 100
        # self.standard_price = Decimal(rounded_price)

    # Handle email sending
        if self.request:
            try:
                subject = f"New Product Created for a Request {self.name}"
                message = f"""Name: {self.name},
                            Owner's name: {self.owner.username},
                            Owner's WhatsApp: {self.owner.whatsapp},
                            Owner's call line: {self.owner.call},
                            Price: {self.price},
                            Buyer's Name: {self.request.owner.username},
                            Buyer's Whatsapp line: {self.request.owner.whatsapp},
                            Buyer's Call line: {self.request.owner.call} 
                            """
                send_email("titobiloluwaa83@gmail.com", subject, message)
            except Exception as e:
                print(f"Email send failed for product {self.name}: {str(e)}")

            
        if self.sold and self.datesold is None:
            self.datesold = now()
        # Clear datesold if sold is changed back to False
        elif not self.sold:
            self.datesold = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.owner.username}"