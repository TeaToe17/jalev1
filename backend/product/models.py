# from django.db import models
# from django.utils.timezone import now

# import os
# from dotenv import load_dotenv

# from .tasks import browser_notify

# load_dotenv()

# class Category(models.Model):
#     name = models.CharField(max_length=100, unique=True)
#     icon = models.CharField(max_length=20, null=True)

#     def __str__(self):
#         return self.name

# # Old Product Model
# class Product(models.Model):
#     name = models.CharField(max_length=50, null = True)
#     price = models.DecimalField(max_digits=10, decimal_places=2)
#     stock = models.PositiveIntegerField(default=1)
#     categories = models.ManyToManyField("product.Category", related_name="category_products")
#     imagefile = models.ImageField(upload_to="products_images/", blank=True, null=True)  # Write images in form of file to this field
#     image = models.URLField(blank=True, null=True)  # Read images in form of cloudinary URLS from this field
#     used = models.BooleanField(default=False)
#     extra_field = models.JSONField(default=dict, blank=True, null=True)
#     created = models.DateField(auto_now_add=True, null=True)
#     owner = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="products", null=True)
#     request = models.ForeignKey("request.Request", on_delete=models.SET_NULL, related_name="requested_products", null=True, blank=True)
#     sold = models.BooleanField(default=False)
#     negotiable = models.BooleanField(default=False)
#     datesold = models.DateTimeField(blank=True, null=True)
#     is_sticky = models.BooleanField(default=False)
#     sticky_timestamp = models.DateTimeField(null=True, blank=True)
#     reserved = models.BooleanField(default=False)

# # New Product model for product variant
# class Product(models.Model):
#     name = models.CharField(max_length=50, null = True)
#     categories = models.ManyToManyField("product.Category", related_name="category_products")
#     created = models.DateField(auto_now_add=True, null=True)
#     owner = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="products", null=True)
#     is_sticky = models.BooleanField(default=False)
#     sticky_timestamp = models.DateTimeField(null=True, blank=True)


#     def save(self, *args, **kwargs):

#     # Handle email sending
#         if self.request:
#             try:
#                 subject = f"New Product Created for a Request {self.name}"
#                 message = f"""Name: {self.name},
#                             Owner's name: {self.owner.username},
#                             Owner's WhatsApp: {self.owner.whatsapp},
#                             Owner's call line: {self.owner.call},
#                             Price: {self.price},
#                             Buyer's Name: {self.request.owner.username},
#                             Buyer's Whatsapp line: {self.request.owner.whatsapp},
#                             Buyer's Call line: {self.request.owner.call} 
#                             """
#                 url = os.getenv("JALE_BACKEND_URL")
#                 browser_notify(2,subject,message,url)
#             except Exception as e:
#                 print(f"Email send failed for product {self.name}: {str(e)}")

            
#         if self.sold and self.datesold is None:
#             self.datesold = now()
#         # Clear datesold if sold is changed back to False
#         elif not self.sold:
#             self.datesold = None

#         super().save(*args, **kwargs)

#     def format_whatsapp_link(self, number: str) -> str:
#         """
#         Convert a phone number into a WhatsApp-compatible URL.
#         Replaces leading '0' with '234' (Nigeria code).
#         """
#         if not number:
#             return ""
#         number = number.strip()
#         if number.startswith("0"):
#             number = "234" + number[1:]
#         return f"https://wa.me/{number}"

#     def __str__(self):
#         """
#         Show concise but informative summary in admin/list views.
#         """
#         return (
#             f"{self.name} | ₦{self.price} | "
#             f"Owner: {self.owner.username} ({self.format_whatsapp_link(self.owner.whatsapp)}) | "
#             f"Created: {self.created.strftime('%Y-%m-%d %H:%M')}"
#         )
    
# class ProductVariant(models.Model):
#     product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
#     sku = models.CharField(max_length=100, unique=True)
#     price = models.DecimalField(max_digits=10, decimal_places=2)
#     stock = models.PositiveIntegerField(default=1)
#     attributes = models.JSONField(default=dict, blank=True, null=True)
#     negotiable = models.BooleanField(default=False)
#     used = models.BooleanField(default=False)
#     sold = models.BooleanField(default=False)
#     reserved = models.BooleanField(default=False)
#     imagefile = models.ImageField(upload_to="products_images/", blank=True, null=True)  # Write images in form of file to this field
#     image = models.URLField(blank=True, null=True)  # Read images in form of cloudinary URLS from this field
#     created = models.DateField(auto_now_add=True, null=True)
#     request = models.ForeignKey("request.Request", on_delete=models.SET_NULL, related_name="requested_products", null=True, blank=True)
#     datesold = models.DateTimeField(blank=True, null=True)

import os
import re
from django.db import models
from django.utils.timezone import now
from django.core.exceptions import ValidationError
from dotenv import load_dotenv

from .tasks import browser_notify

load_dotenv()

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=20, null=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=50, null=True)
    categories = models.ManyToManyField("product.Category", related_name="category_products")
    created = models.DateField(auto_now_add=True, null=True)
    owner = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="products", null=True)
    is_sticky = models.BooleanField(default=False)
    sticky_timestamp = models.DateTimeField(null=True, blank=True)
    
    # Track which variant acts as the representative profile on the feed listing page
    preferred_variant = models.ForeignKey(
        "product.ProductVariant", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="preferred_for_products"
    )

    def format_whatsapp_link(self, number: str) -> str:
        if not number:
            return ""
        number = number.strip()
        if number.startswith("0"):
            number = "234" + number[1:]
        return f"wa.me/{number}"

    def auto_switch_preferred_variant(self):
        """
        If the current preferred variant goes out of stock or is marked sold,
        automatically switch to the next available child variant.
        """
        if self.preferred_variant and not self.preferred_variant.sold and self.preferred_variant.stock > 0:
            return

        next_available = self.variants.filter(sold=False, stock__gt=0).first()
        
        if next_available:
            self.variants.update(is_preferred=False)
            
            next_available.is_preferred = True
            next_available.save(update_fields=['is_preferred'])
            
            self.preferred_variant = next_available
            self.save(update_fields=['preferred_variant'])

    def __str__(self):
        username = self.owner.username if self.owner else "No Owner"
        created_str = self.created.strftime('%Y-%m-%d') if self.created else "Unsaved"
        return f"{self.name} | Owner: {username} | Created: {created_str}"


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=1)
    attributes = models.JSONField(default=dict, blank=True, null=True)
    negotiable = models.BooleanField(default=False)
    used = models.BooleanField(default=False)
    sold = models.BooleanField(default=False)
    reserved = models.BooleanField(default=False)
    imagefile = models.ImageField(upload_to="products_images/", blank=True, null=True)
    image = models.URLField(blank=True, null=True)
    created = models.DateField(auto_now_add=True, null=True)
    datesold = models.DateTimeField(blank=True, null=True)
    request = models.ForeignKey(
        "request.Request", 
        on_delete=models.SET_NULL, 
        related_name="requested_variants", 
        null=True, 
        blank=True
    )
    is_preferred = models.BooleanField(default=False)

    def generate_dynamic_sku(self) -> str:
        if not self.product or not self.product.name:
            return "VAR"
        clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', self.product.name).upper()
        words = clean_name.split()
        prefix = "".join([word if word.isalpha() else word for word in words])
        
        attr_slugs = []
        if isinstance(self.attributes, dict):
            for key in sorted(self.attributes.keys()):
                val = str(self.attributes[key]).strip().replace(" ", "")
                if val:
                    attr_slugs.append(val.upper())

        sku_parts = [prefix] + attr_slugs
        return "-".join(sku_parts)

    def clean(self):
        super().clean()
        generated_sku = self.generate_dynamic_sku()
        duplicate_exists = ProductVariant.objects.filter(
            product__owner=self.product.owner,
            sku=generated_sku
        ).exclude(pk=self.pk).exists()

        if duplicate_exists:
            raise ValidationError(f"A variant matching SKU '{generated_sku}' already exists within this vendor account.")

    def save(self, *args, **kwargs):
        self.sku = self.generate_dynamic_sku()
        self.full_clean()

        if self.request and self.product:
            try:
                owner = self.product.owner
                buyer = self.request.owner
                subject = f"New Variant Created for Request: {self.product.name} ({self.sku})"
                message = f"Product: {self.product.name} ({self.sku}), Price: {self.price}"
                url = os.getenv("JALE_BACKEND_URL")
                browser_notify(2, subject, message, url)
            except Exception as e:
                print(f"Notification failed: {str(e)}")

        if self.sold and self.datesold is None:
            self.datesold = now()
        elif not self.sold:
            self.datesold = None

        super().save(*args, **kwargs)

        # Self-heal representative listing face instantly if this active preference sold out
        if (self.sold or self.stock == 0) and self.is_preferred and self.product:
            self.product.auto_switch_preferred_variant()

    def __str__(self):
        status = "Sold" if self.sold else "Available"
        return f"{self.product.name} ({self.sku}) | ₦{self.price} | Status: {status}"
