import requests
from rest_framework import serializers
from .models import Product, Category, CustomUser, Request

class ProductSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(many=True, queryset=Category.objects.all())
    request = serializers.PrimaryKeyRelatedField(queryset=Request.objects.all(), required=False, allow_null=True)
    owner = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)

    class Meta:
        model = Product
        fields = ["id", "name", "price", "image", "imagefile", "owner", "stock", "categories", "created", "sold", "negotiable", "request", "used", "extra_field", "is_sticky", "reserved"]
        extra_kwargs = {
            "created": {"read_only": True},
            "sold": {"read_only": True},
            "owner": {"read_only": True}
        }

    def create(self, validated_data):
        image_file = validated_data.get('imagefile')
        
        if image_file:
            # Upload to ImageKit
            image_url = self._upload_to_imagekit(image_file)
            validated_data['image'] = image_url

        categories = validated_data.pop('categories', [])
        product = Product.objects.create(**validated_data)
        product.categories.set(categories)
        
        return product

    def _upload_to_imagekit(self, image_file):
        """Upload image to ImageKit and return the URL"""
        import os
        from django.conf import settings
        
        api_key = os.getenv('IMAGEKIT_PUBLIC_KEY')
        private_key = os.getenv('IMAGEKIT_PRIVATE_KEY')
        
        # Prepare multipart form data
        files = {
            'file': (image_file.name, image_file.file, image_file.content_type),
        }
        
        data = {
            'publicKey': api_key,
            'fileName': f"product_{image_file.name}",
            # Optional: add transformation parameters
            'transformation': {
                'pre': [
                    {
                        'quality': '85',
                        'format': 'auto'
                    }
                ]
            }
        }
        
        # Make request to ImageKit Upload API
        response = requests.post(
            'https://upload.imagekit.io/api/v1/files/upload/',
            files=files,
            data=data,
            auth=(private_key, '')  # ImageKit uses Basic Auth
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['url']  # Returns the optimized URL
        else:
            raise serializers.ValidationError(f"ImageKit upload failed: {response.text}")