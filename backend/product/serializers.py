# from rest_framework import serializers
# from .models import Product, Category
# from request.models import Request
# from user.models import CustomUser
# from cloudinary.uploader import upload

# class ProductSerializer(serializers.ModelSerializer):
#     categories = serializers.PrimaryKeyRelatedField(many = True, queryset = Category.objects.all())
#     request = serializers.PrimaryKeyRelatedField(queryset = Request.objects.all(), required=False, allow_null=True)
#     owner = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)


#     class Meta:
#         model = Product
#         fields = ["id", "name", "price", "image", "imagefile", "owner", "stock", "categories", "created", "sold", "negotiable", "request", "used", "extra_field", "is_sticky", "reserved"]
#         extra_kwargs = {"created":{"read_only":True}, "sold":{"read_only":True}, "owner":{"read_only":True}}

#     def create(self, validated_data):
#         image_file = validated_data.get('imagefile')  # still upload image
#         result = upload(image_file, quality="85")
#         validated_data['image'] = result.get('secure_url')

#         categories = validated_data.pop('categories', [])  # extract M2M field
#         product = Product.objects.create(**validated_data)  # create instance

#         product.categories.set(categories)  # set M2M after save
#         return product
    
#     def update(self, instance, validated_data):

#         image_file = validated_data.get('imagefile')  # still upload image
#         if image_file:
#             result = upload(image_file, quality="85")
#             if result:
#                 instance.image = result.get('secure_url')

#         new_stock = validated_data.get("stock")

#         if new_stock and new_stock > 0:
#             instance.sold = not (new_stock > instance.stock)
#             instance.reserved = not (new_stock > instance.stock)

#         categories = validated_data.pop('categories', [])  # extract M2M field

#         for attr, value in validated_data.items():
#             setattr(instance, attr, value)

#         instance.categories.set(categories)  # set M2M after save

#         instance.save()
#         return instance

# class CategorySerialzer(serializers.ModelSerializer):
#     class Meta:
#         model = Category
#         fields = ["id", "name", "icon"]
#         extra_kwargs = {"name":{"read_only":True},"icon":{"read_only":True}}  


import json, random
from django.db import transaction
from django.forms.models import model_to_dict
from rest_framework import serializers
from .models import Product, Category, ProductVariant
from request.models import Request
from user.models import CustomUser
from cloudinary.uploader import upload

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "icon"]


class ProductVariantSerializer(serializers.ModelSerializer):
    request = serializers.PrimaryKeyRelatedField(
        queryset=Request.objects.all(),
        required=False,
        allow_null=True
    )
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductVariant
        fields = [
            "id", "price", "stock", "attributes", "negotiable", "used", "imagefile", "image", "request", "is_preferred", "created",
            "sold"
        ]

        extra_kwargs = {"created": {"read_only": True},
                         "sold": {"read_only": True},
                         "id": {"read_only": False},
                         "image": {"read_only": True},}


class ProductSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all()
    )
    variants = ProductVariantSerializer(many=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "categories", "owner", "is_sticky", "variants", "preferred_variant","sticky_timestamp"
        ]
        extra_kwargs={"preferred_variant":{"read_only":True},"is_sticky":{"read_only":True}, "sticky_timestamp":{"read_only":True}}

    def create(self, validated_data):

        categories_data = validated_data.pop("categories", [])
        variants_data = validated_data.pop("variants", [])

        with transaction.atomic():

            # create product
            product = Product.objects.create(**validated_data)

            # set categories
            product.categories.set(categories_data)

            created_variants = []

            # create variants
            created_variants = []

            for variant_data in variants_data:

                image_file = variant_data.get("imagefile")

                if image_file:
                    result = upload(image_file, quality="85")
                    variant_data["image"] = result.get("secure_url")

                variant = ProductVariant.objects.create(
                    product=product,
                    **variant_data
                )

                created_variants.append(variant)

            preferred_variant = None
            if len(created_variants) == 1:
                preferred_variant = created_variants[0]

            else:
                # check explicitly marked preferred variants
                preferred_candidates = [
                    v for v in created_variants if v.is_preferred
                ]

                if preferred_candidates:
                    preferred_variant = preferred_candidates[0]
                else:
                    # fallback: random selection
                    preferred_variant = random.choice(created_variants)

            # assign preferred variant to product
            product.preferred_variant = preferred_variant
            product.save()

        return product

    def update(self, instance, validated_data):
        categories_data = validated_data.pop("categories", None)
        variants_data = validated_data.pop("variants", None)
        print("variants DATA", variants_data)
        
        with transaction.atomic():
            # UPDATE PRODUCT FIELDS
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            
            # UPDATE CATEGORIES
            if categories_data is not None:
                instance.categories.set(categories_data)
            
            # UPDATE VARIANTS
            if variants_data is not None:
                existing_variants = {
                    variant.id: variant
                    for variant in instance.variants.all()
                }
                sent_variant_ids = []
                created_or_updated_variants = []
                
                for idx, variant_data in enumerate(variants_data):

                    variant_id = variant_data.pop("id", None)
                    image_file = variant_data.pop("imagefile", None)
                    variant_data.pop("image", None)

                    # UPDATE EXISTING
                    if variant_id and variant_id in existing_variants:
                        variant = existing_variants[variant_id]

                        if image_file:
                            result = upload(image_file, quality="85")
                            variant.image = result.get("secure_url")

                        for attr, value in variant_data.items():
                            setattr(variant, attr, value)

                        variant.save()

                        sent_variant_ids.append(variant.id)
                        created_or_updated_variants.append(variant)

                    # CREATE NEW
                    else:
                        if image_file:
                            result = upload(image_file, quality="85")
                            variant_data["image"] = result.get("secure_url")

                        new_variant = ProductVariant.objects.create(
                            product=instance,
                            **variant_data
                        )

                        sent_variant_ids.append(new_variant.id)
                        created_or_updated_variants.append(new_variant)
                # --------------------------------
                # PREFERRED VARIANT (AFTER LOOP)
                # --------------------------------
                preferred_variant = None

                preferred_candidates = [
                    v for v in created_or_updated_variants
                    if v.is_preferred is True
                ]

                print(
                    "Preferred candidates",
                    [model_to_dict(v) for v in preferred_candidates]
                )

                if preferred_candidates:
                    preferred_variant = preferred_candidates[0]

                elif created_or_updated_variants:
                    preferred_variant = created_or_updated_variants[0]

                instance.variants.update(is_preferred=False)

                if preferred_variant:
                    preferred_variant.is_preferred = True
                    preferred_variant.save(update_fields=["is_preferred"])

                    instance.preferred_variant = preferred_variant
                    instance.save(update_fields=["preferred_variant"])
        return instance

class ProductListSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)
    
    # Flattens properties down from preferred variant configuration directly for the UI feed listing
    price = serializers.DecimalField(source="preferred_variant.price", max_digits=10, decimal_places=2, read_only=True)
    image = serializers.URLField(source="preferred_variant.image", read_only=True)
    sku = serializers.CharField(source="preferred_variant.sku", read_only=True)
    stock = serializers.IntegerField(source="preferred_variant.stock", read_only=True)
    attributes = serializers.JSONField(source="preferred_variant.attributes", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "categories", "created", "owner", 
            "is_sticky", "sticky_timestamp", "price", "image", "sku", "stock", "attributes"
        ]
