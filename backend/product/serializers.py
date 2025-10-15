from rest_framework import serializers
from .models import Product, Category
from request.models import Request
from user.models import CustomUser
from cloudinary.uploader import upload

class ProductSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(many = True, queryset = Category.objects.all())
    request = serializers.PrimaryKeyRelatedField(queryset = Request.objects.all(), required=False, allow_null=True)
    owner = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)


    class Meta:
        model = Product
        fields = ["id", "name", "price", "image", "imagefile", "owner", "stock", "categories", "created", "sold", "negotiable", "request", "used", "extra_field", "is_sticky", "reserved"]
        extra_kwargs = {"created":{"read_only":True}, "sold":{"read_only":True}, "owner":{"read_only":True}}

    def create(self, validated_data):
        image_file = validated_data.get('imagefile')  # still upload image
        result = upload(image_file, quality="85")
        validated_data['image'] = result.get('secure_url')

        categories = validated_data.pop('categories', [])  # extract M2M field
        product = Product.objects.create(**validated_data)  # create instance

        product.categories.set(categories)  # set M2M after save
        return product
    
    def update(self, instance, validated_data):
    # Run your custom logic only during updates
        # print("validated_data", validated_data)
        # print("instance", instance)

        image_file = validated_data.get('imagefile')  # still upload image
        if image_file:
            result = upload(image_file, quality="85")
            if result:
                instance.image = result.get('secure_url')

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

class CategorySerialzer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "icon"]
        extra_kwargs = {"name":{"read_only":True},"icon":{"read_only":True}}  