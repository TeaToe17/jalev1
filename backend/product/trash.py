
# import random

# from django.db import transaction
# from django.forms.models import model_to_dict

# from rest_framework import serializers

# from cloudinary.uploader import upload

# from .models import Product, Category, ProductVariant

# from request.models import Request
# from user.models import CustomUser


# class CategorySerializer(serializers.ModelSerializer):

#     class Meta:
#         model = Category
#         fields = ["id", "name", "icon"]


# class ProductVariantSerializer(serializers.ModelSerializer):

#     request = serializers.PrimaryKeyRelatedField(
#         queryset=Request.objects.all(),
#         required=False,
#         allow_null=True
#     )

#     id = serializers.IntegerField(required=False)

#     class Meta:
#         model = ProductVariant

#         fields = [
#             "id",
#             "price",
#             "stock",
#             "attributes",
#             "negotiable",
#             "used",
#             "imagefile",
#             "image",
#             "request",
#             "is_preferred",
#             "created",
#             "sold"
#         ]

#         extra_kwargs = {
#             "created": {"read_only": True},
#             "sold": {"read_only": True},
#             "id": {"read_only": False},
#             "image": {"read_only": True},
#         }


# class ProductSerializer(serializers.ModelSerializer):

#     categories = serializers.PrimaryKeyRelatedField(
#         many=True,
#         queryset=Category.objects.all()
#     )

#     variants = ProductVariantSerializer(many=True)

#     class Meta:
#         model = Product

#         fields = [
#             "id",
#             "name",
#             "categories",
#             "owner",
#             "is_sticky",
#             "variants",
#             "preferred_variant",
#             "sticky_timestamp"
#         ]

#         extra_kwargs = {
#             "preferred_variant": {"read_only": True},
#             "is_sticky": {"read_only": True},
#             "sticky_timestamp": {"read_only": True},
#         }

#     def create(self, validated_data):

#         categories_data = validated_data.pop("categories", [])
#         variants_data = validated_data.pop("variants", [])

#         with transaction.atomic():

#             product = Product.objects.create(**validated_data)

#             product.categories.set(categories_data)

#             created_variants = []

#             for variant_data in variants_data:

#                 image_file = variant_data.get("imagefile")

#                 if image_file:
#                     result = upload(image_file, quality="85")
#                     variant_data["image"] = result.get("secure_url")

#                 variant = ProductVariant.objects.create(
#                     product=product,
#                     **variant_data
#                 )

#                 created_variants.append(variant)

#             preferred_variant = None

#             if len(created_variants) == 1:
#                 preferred_variant = created_variants[0]

#             else:

#                 preferred_candidates = [
#                     v for v in created_variants
#                     if v.is_preferred
#                 ]

#                 if preferred_candidates:
#                     preferred_variant = preferred_candidates[0]

#                 else:
#                     preferred_variant = random.choice(
#                         created_variants
#                     )

#             product.preferred_variant = preferred_variant
#             product.save()

#         return product

#     def update(self, instance, validated_data):

#         categories_data = validated_data.pop(
#             "categories",
#             None
#         )

#         variants_data = validated_data.pop(
#             "variants",
#             None
#         )

#         with transaction.atomic():

#             # UPDATE PRODUCT FIELDS
#             for attr, value in validated_data.items():
#                 setattr(instance, attr, value)

#             instance.save()

#             # UPDATE CATEGORIES
#             if categories_data is not None:
#                 instance.categories.set(categories_data)

#             # UPDATE VARIANTS
#             if variants_data is not None:

#                 # Uses prefetched variants from queryset
#                 existing_variants = {
#                     variant.id: variant
#                     for variant in instance.variants.all()
#                 }

#                 created_or_updated_variants = []

#                 for idx, variant_data in enumerate(
#                     variants_data
#                 ):

#                     variant_id = variant_data.pop(
#                         "id",
#                         None
#                     )

#                     image_file = variant_data.pop(
#                         "imagefile",
#                         None
#                     )

#                     variant_data.pop("image", None)

#                     # UPDATE EXISTING
#                     if (
#                         variant_id
#                         and variant_id in existing_variants
#                     ):

#                         variant = existing_variants[
#                             variant_id
#                         ]

#                         if image_file:

#                             result = upload(
#                                 image_file,
#                                 quality="85"
#                             )

#                             variant.image = result.get(
#                                 "secure_url"
#                             )

#                         for attr, value in (
#                             variant_data.items()
#                         ):
#                             setattr(
#                                 variant,
#                                 attr,
#                                 value
#                             )

#                         variant.save()

#                         created_or_updated_variants.append(
#                             variant
#                         )

#                     # CREATE NEW
#                     else:

#                         if image_file:

#                             result = upload(
#                                 image_file,
#                                 quality="85"
#                             )

#                             variant_data["image"] = (
#                                 result.get("secure_url")
#                             )

#                         new_variant = (
#                             ProductVariant.objects.create(
#                                 product=instance,
#                                 **variant_data
#                             )
#                         )

#                         created_or_updated_variants.append(
#                             new_variant
#                         )

#                 # PREFERRED VARIANT
#                 preferred_variant = None

#                 preferred_candidates = [
#                     v
#                     for v in created_or_updated_variants
#                     if v.is_preferred is True
#                 ]

#                 print(
#                     "Preferred candidates",
#                     [
#                         model_to_dict(v)
#                         for v in preferred_candidates
#                     ]
#                 )

#                 if preferred_candidates:

#                     preferred_variant = (
#                         preferred_candidates[0]
#                     )

#                 elif created_or_updated_variants:

#                     preferred_variant = (
#                         created_or_updated_variants[0]
#                     )

#                 instance.variants.update(
#                     is_preferred=False
#                 )

#                 if preferred_variant:

#                     preferred_variant.is_preferred = True

#                     preferred_variant.save(
#                         update_fields=["is_preferred"]
#                     )

#                     instance.preferred_variant = (
#                         preferred_variant
#                     )

#                     instance.save(
#                         update_fields=[
#                             "preferred_variant"
#                         ]
#                     )

#         return instance


# class ProductListSerializer(serializers.ModelSerializer):

#     categories = CategorySerializer(
#         many=True,
#         read_only=True
#     )

#     price = serializers.DecimalField(
#         source="preferred_variant.price",
#         max_digits=10,
#         decimal_places=2,
#         read_only=True
#     )

#     image = serializers.URLField(
#         source="preferred_variant.image",
#         read_only=True
#     )

#     sku = serializers.CharField(
#         source="preferred_variant.sku",
#         read_only=True
#     )

#     stock = serializers.IntegerField(
#         source="preferred_variant.stock",
#         read_only=True
#     )

#     attributes = serializers.JSONField(
#         source="preferred_variant.attributes",
#         read_only=True
#     )

#     class Meta:
#         model = Product

#         fields = [
#             "id",
#             "name",
#             "categories",
#             "created",
#             "owner",
#             "is_sticky",
#             "sticky_timestamp",
#             "price",
#             "image",
#             "sku",
#             "stock",
#             "attributes"
#         ]


# import json, random
# from django.db import transaction
# from django.forms.models import model_to_dict
# from rest_framework import serializers
# from .models import Product, Category, ProductVariant
# from request.models import Request
# from user.models import CustomUser
# from cloudinary.uploader import upload

# class CategorySerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Category
#         fields = ["id", "name", "icon"]


# class ProductVariantSerializer(serializers.ModelSerializer):
#     request = serializers.PrimaryKeyRelatedField(
#         queryset=Request.objects.all(),
#         required=False,
#         allow_null=True
#     )
#     id = serializers.IntegerField(required=False)

#     class Meta:
#         model = ProductVariant
#         fields = [
#             "id", "price", "stock", "attributes", "negotiable", "used", "imagefile", "image", "request", "is_preferred", "created",
#             "sold"
#         ]

#         extra_kwargs = {"created": {"read_only": True},
#                          "sold": {"read_only": True},
#                          "id": {"read_only": False},
#                          "image": {"read_only": True},}


# class ProductSerializer(serializers.ModelSerializer):
#     categories = serializers.PrimaryKeyRelatedField(
#         many=True,
#         queryset=Category.objects.all()
#     )
#     variants = ProductVariantSerializer(many=True)

#     class Meta:
#         model = Product
#         fields = [
#             "id", "name", "categories", "owner", "is_sticky", "variants", "preferred_variant","sticky_timestamp"
#         ]
#         extra_kwargs={"preferred_variant":{"read_only":True},"is_sticky":{"read_only":True}, "sticky_timestamp":{"read_only":True}}

#     def create(self, validated_data):

#         categories_data = validated_data.pop("categories", [])
#         variants_data = validated_data.pop("variants", [])

#         with transaction.atomic():

#             # create product
#             product = Product.objects.create(**validated_data)

#             # set categories
#             product.categories.set(categories_data)

#             created_variants = []

#             # create variants
#             created_variants = []

#             for variant_data in variants_data:

#                 image_file = variant_data.get("imagefile")

#                 if image_file:
#                     result = upload(image_file, quality="85")
#                     variant_data["image"] = result.get("secure_url")

#                 variant = ProductVariant.objects.create(
#                     product=product,
#                     **variant_data
#                 )

#                 created_variants.append(variant)

#             preferred_variant = None
#             if len(created_variants) == 1:
#                 preferred_variant = created_variants[0]

#             else:
#                 # check explicitly marked preferred variants
#                 preferred_candidates = [
#                     v for v in created_variants if v.is_preferred
#                 ]

#                 if preferred_candidates:
#                     preferred_variant = preferred_candidates[0]
#                 else:
#                     # fallback: random selection
#                     preferred_variant = random.choice(created_variants)

#             # assign preferred variant to product
#             product.preferred_variant = preferred_variant
#             product.save()

#         return product

#     def update(self, instance, validated_data):
#         categories_data = validated_data.pop("categories", None)
#         variants_data = validated_data.pop("variants", None)
#         print("variants DATA", variants_data)
        
#         with transaction.atomic():
#             # UPDATE PRODUCT FIELDS
#             for attr, value in validated_data.items():
#                 setattr(instance, attr, value)
#             instance.save()
            
#             # UPDATE CATEGORIES
#             if categories_data is not None:
#                 instance.categories.set(categories_data)
            
#             # UPDATE VARIANTS
#             if variants_data is not None:
#                 existing_variants = {
#                     variant.id: variant
#                     for variant in instance.variants.all()
#                 }
#                 sent_variant_ids = []
#                 created_or_updated_variants = []
                
#                 for idx, variant_data in enumerate(variants_data):

#                     variant_id = variant_data.pop("id", None)
#                     image_file = variant_data.pop("imagefile", None)
#                     variant_data.pop("image", None)

#                     # UPDATE EXISTING
#                     if variant_id and variant_id in existing_variants:
#                         variant = existing_variants[variant_id]

#                         if image_file:
#                             result = upload(image_file, quality="85")
#                             variant.image = result.get("secure_url")

#                         for attr, value in variant_data.items():
#                             setattr(variant, attr, value)

#                         variant.save()

#                         sent_variant_ids.append(variant.id)
#                         created_or_updated_variants.append(variant)

#                     # CREATE NEW
#                     else:
#                         if image_file:
#                             result = upload(image_file, quality="85")
#                             variant_data["image"] = result.get("secure_url")

#                         new_variant = ProductVariant.objects.create(
#                             product=instance,
#                             **variant_data
#                         )

#                         sent_variant_ids.append(new_variant.id)
#                         created_or_updated_variants.append(new_variant)
#                 # --------------------------------
#                 # PREFERRED VARIANT (AFTER LOOP)
#                 # --------------------------------
#                 preferred_variant = None

#                 preferred_candidates = [
#                     v for v in created_or_updated_variants
#                     if v.is_preferred is True
#                 ]

#                 print(
#                     "Preferred candidates",
#                     [model_to_dict(v) for v in preferred_candidates]
#                 )

#                 if preferred_candidates:
#                     preferred_variant = preferred_candidates[0]

#                 elif created_or_updated_variants:
#                     preferred_variant = created_or_updated_variants[0]

#                 instance.variants.update(is_preferred=False)

#                 if preferred_variant:
#                     preferred_variant.is_preferred = True
#                     preferred_variant.save(update_fields=["is_preferred"])

#                     instance.preferred_variant = preferred_variant
#                     instance.save(update_fields=["preferred_variant"])
#         return instance

# class ProductListSerializer(serializers.ModelSerializer):
#     categories = CategorySerializer(many=True, read_only=True)
    
#     # Flattens properties down from preferred variant configuration directly for the UI feed listing
#     price = serializers.DecimalField(source="preferred_variant.price", max_digits=10, decimal_places=2, read_only=True)
#     image = serializers.URLField(source="preferred_variant.image", read_only=True)
#     sku = serializers.CharField(source="preferred_variant.sku", read_only=True)
#     stock = serializers.IntegerField(source="preferred_variant.stock", read_only=True)
#     attributes = serializers.JSONField(source="preferred_variant.attributes", read_only=True)

#     class Meta:
#         model = Product
#         fields = [
#             "id", "name", "categories", "created", "owner", 
#             "is_sticky", "sticky_timestamp", "price", "image", "sku", "stock", "attributes"
#         ]


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
