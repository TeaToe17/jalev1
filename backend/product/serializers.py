from rest_framework import serializers
from .models import Product, Category
from request.models import Request
from user.models import CustomUser

class ProductSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(many = True, queryset = Category.objects.all())
    request = serializers.PrimaryKeyRelatedField(queryset = Request.objects.all(), required=False, allow_null=True)
    owner = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)

    class Meta:
        model = Product
        fields = ["id", "name", "price", "image", "owner", "stock", "categories", "created", "sold", "request", "new", "extra_field"]
        extra_kwargs = {"created":{"read_only":True}, "sold":{"read_only":True}, "owner":{"read_only":True}}

    
class CategorySerialzer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]
        extra_kwargs = {"name":{"read_only":True}}  