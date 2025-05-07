from django.db import models
from django.utils.timezone import now

import math
from decimal import Decimal

from .tasks import send_email

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=50, null = True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=1)
    categories = models.ManyToManyField("product.Category", related_name="category_products")
    description = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to="product_images/", null=True)
    new = models.BooleanField(default=False)
    extra_field = models.JSONField(default=dict, blank=True, null=True)
    created = models.DateField(auto_now_add=True, null=True)
    owner = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="products", null=True)
    request = models.ForeignKey("request.Request", on_delete=models.SET_NULL, related_name="requested_products", null=True, blank=True)
    sold = models.BooleanField(default=False)
    datesold = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):

        # Increase owner_price by 20%
        increased_price = self.price * Decimal('1.2')
        
        # Round up to the nearest 500
        rounded_price = math.ceil(increased_price / 100) * 100
        self.standard_price = Decimal(rounded_price)

        if self.request:
            subject = f"New Product Created for a Request {self.name}"
            message = f"""Name: {self.name},
                        Owner's name: {self.owner.username},
                        Owner's WhatsApp: {self.owner.whatsapp},
                        Owner's call line: {self.owner.call},
                        Price: {self.price},
                        Buyer's Name: {self.request.buyer_name},
                        Buyer's Whatsapp line: {self.request.buyer_whatsapp_contact},
                        Buyer's Call line: {self.request.buyer_call_contact} 
                        """
            send_email.delay("titobiloluwaa84@gmail.com", subject, message)
            
        if self.sold and self.datesold is None:
            self.datesold = now()
        # Clear datesold if sold is changed back to False
        elif not self.sold:
            self.datesold = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.owner.username}"