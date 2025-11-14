from rest_framework import serializers
from .models import Product, Category
from request.models import Request
from user.models import CustomUser
import requests
import base64, os
from dotenv import load_dotenv

load_dotenv()

def upload_to_imagekit(image_file):
    """Upload image to ImageKit and return URL"""

    # Read file into raw bytes (IMPORTANT)
    file_bytes = image_file.read()
    base64_file = base64.b64encode(file_bytes).decode()

    payload = {
        "file": base64_file,
        "fileName": image_file.name,   # keep original filename
        "folder": "/products/",
    }

    response = requests.post(
        "https://upload.imagekit.io/api/v1/files/upload",
        auth=(os.getenv("IMAGEKIT_PRIVATE_KEY"), ""),
        data=payload
    )

    if response.status_code != 200:
        raise serializers.ValidationError(
            f"ImageKit upload failed: {response.text}"
        )

    return response.json()["url"]

class ProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = ["id", "name", "price", "image", "imagefile", "owner", "stock", "categories", "created", "sold", "negotiable", "request", "used", "extra_field", "is_sticky", "reserved"]
        extra_kwargs = {"created":{"read_only":True}, "sold":{"read_only":True}, "owner":{"read_only":True}}


    def create(self, validated_data):
        image_file = validated_data.get("imagefile")

        if image_file:
            uploaded_url = upload_to_imagekit(image_file)
            validated_data["image"] = uploaded_url

        categories = validated_data.pop("categories", [])
        product = Product.objects.create(**validated_data)
        product.categories.set(categories)
        return product

    def update(self, instance, validated_data):

        image_file = validated_data.get('imagefile')  # still upload image
        if image_file:
            uploaded_url = upload_to_imagekit(image_file)
            if uploaded_url:
                instance.image = uploaded_url

        new_stock = validated_data.get("stock")

        if new_stock and new_stock > 0:
            instance.sold = not (new_stock > instance.stock)
            instance.reserved = not (new_stock > instance.stock)

        categories = validated_data.pop('categories', [])  # extract M2M field

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.categories.set(categories)  # set M2M after save

        instance.save()
        return instance
    
    def to_representation(self, instance):
        data = super().to_representation(instance)

        # Add quality + auto format transformation
        if data.get("image"):
            data["image"] = f"{data['image']}?tr=q-85,f-auto"

        return data

class CategorySerialzer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "icon"]
        extra_kwargs = {"name":{"read_only":True},"icon":{"read_only":True}}  