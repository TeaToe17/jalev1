from rest_framework import serializers

from .models import Request

class RequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Request
        fields  = ["id", "name", "image", "level", "description", "course", "buyer_name", "buyer_whatsapp_contact", "buyer_call_contact"]
        extra_kwargs = {"buyer_name":{"write_only":True}, "buyer_whatsapp_contact":{"write_only":True}, "buyer_call_contact":{"write_only":True}}