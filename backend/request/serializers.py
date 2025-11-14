from rest_framework import serializers
from .models import Request
from dotenv import load_dotenv
import os, base64, requests

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



class RequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Request
        fields  = ["id", "name", "image", "imagefile", "description",]

    def create(self, validated_data):
        image_file = validated_data.get('imagefile')  # still upload image
        if image_file:
            uploaded_url = upload_to_imagekit(image_file)
            validated_data["image"] = uploaded_url

        request = Request.objects.create(**validated_data)  # create instance
        return request
    
    def to_representation(self, instance):
        data = super().to_representation(instance)

        # Add quality + auto format transformation
        if data.get("image"):
            data["image"] = f"{data['image']}?tr=q-85,f-auto"

        return data