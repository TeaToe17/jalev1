from rest_framework import serializers

from .models import Order
from product.models import Product

class OrderSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    class Meta:
        model = Order
        fields = ["id", "product", "buyer_name", "buyer_whatsapp_contact", "buyer_call_contact", "agreed_price", "completed"]