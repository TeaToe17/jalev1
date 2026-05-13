"""
PREVIEW FILE - New Serializers for Product System Redesign
(This is a preview - not yet in production)

Serializers convert model instances to/from JSON for API responses.
"""

from rest_framework import serializers
from datetime import datetime


class ProductVariantSerializer(serializers.Serializer):
    """Serializer for product variants with price and stock management."""
    id = serializers.IntegerField(read_only=True)
    product = serializers.IntegerField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    name = serializers.CharField(max_length=100)
    sku = serializers.CharField(max_length=50)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock = serializers.IntegerField(min_value=0)
    attributes = serializers.JSONField(default=dict, required=False)
    is_active = serializers.BooleanField(default=True)
    created = serializers.DateTimeField(read_only=True)
    updated = serializers.DateTimeField(read_only=True)

    class Meta:
        fields = ['id', 'product', 'product_name', 'name', 'sku', 'price', 'stock',
                 'attributes', 'is_active', 'created', 'updated']


class ProductImageSerializer(serializers.Serializer):
    """Serializer for product images."""
    id = serializers.IntegerField(read_only=True)
    product = serializers.IntegerField()
    imagefile = serializers.URLField(required=False, allow_blank=True)
    image_url = serializers.URLField(required=False, allow_blank=True)
    alt_text = serializers.CharField(max_length=200, required=False, allow_blank=True)
    is_primary = serializers.BooleanField(default=False)
    order = serializers.IntegerField(default=0)
    created = serializers.DateTimeField(read_only=True)
    url = serializers.SerializerMethodField()

    def get_url(self, obj):
        """Get the actual URL of the image"""
        return obj.image_url or (obj.imagefile.url if hasattr(obj, 'imagefile') else None)


class ProductReviewSerializer(serializers.Serializer):
    """Serializer for product reviews."""
    id = serializers.IntegerField(read_only=True)
    product = serializers.IntegerField()
    reviewer = serializers.IntegerField()
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)
    rating = serializers.IntegerField(min_value=1, max_value=5, default=5)
    title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    comment = serializers.CharField(required=False, allow_blank=True)
    helpful_count = serializers.IntegerField(read_only=True, default=0)
    is_verified_purchase = serializers.BooleanField(default=False)
    created = serializers.DateTimeField(read_only=True)
    updated = serializers.DateTimeField(read_only=True)


class ProductDiscountSerializer(serializers.Serializer):
    """Serializer for product discounts with validation."""
    id = serializers.IntegerField(read_only=True)
    product = serializers.IntegerField()
    variant = serializers.IntegerField(required=False, allow_null=True)
    discount_type = serializers.ChoiceField(choices=['percentage', 'fixed'])
    value = serializers.DecimalField(max_digits=10, decimal_places=2)
    description = serializers.CharField(max_length=200, required=False, allow_blank=True)
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    is_active = serializers.BooleanField(default=True)
    created = serializers.DateTimeField(read_only=True)
    is_valid_now = serializers.SerializerMethodField()

    def get_is_valid_now(self, obj):
        """Check if discount is currently valid"""
        return getattr(obj, 'is_valid_now', lambda: False)()


class ProductListSerializer(serializers.Serializer):
    """
    Lightweight serializer for product listings with variant info.
    
    Returns essential product data plus pricing, ratings, and images.
    """
    id = serializers.IntegerField()
    name = serializers.CharField()
    owner = serializers.IntegerField()
    owner_username = serializers.CharField(source='owner.username')
    stock = serializers.IntegerField()
    created = serializers.DateTimeField()
    sold = serializers.BooleanField()
    negotiable = serializers.BooleanField()
    used = serializers.BooleanField()
    is_sticky = serializers.BooleanField()
    reserved = serializers.BooleanField()
    image = serializers.URLField()
    imagefile = serializers.URLField(required=False)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # New fields
    primary_image = serializers.SerializerMethodField()
    variants = ProductVariantSerializer(many=True, read_only=True)
    price_range = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    def get_primary_image(self, obj):
        """Get the primary image if exists"""
        images = getattr(obj, 'images', None)
        if images:
            primary = images.filter(is_primary=True).first()
            if primary:
                return ProductImageSerializer(primary).data
        return None

    def get_price_range(self, obj):
        """
        Get min and max price from variants or product price.
        
        Example response:
        {
            "min": 5000.00,
            "max": 7500.00
        }
        """
        variants = getattr(obj, 'variants', None)
        if variants and variants.filter(is_active=True).exists():
            prices = [v.price for v in variants.filter(is_active=True)]
            return {
                "min": float(min(prices)),
                "max": float(max(prices))
            }
        return {
            "min": float(obj.price),
            "max": float(obj.price)
        }

    def get_average_rating(self, obj):
        """
        Calculate average rating from reviews.
        
        Returns float or None if no reviews.
        """
        reviews = getattr(obj, 'reviews', None)
        if reviews:
            rating_list = [r.rating for r in reviews.all()]
            if rating_list:
                avg = sum(rating_list) / len(rating_list)
                return round(avg, 2)
        return None


class ProductDetailSerializer(serializers.Serializer):
    """
    Detailed serializer with all related data.
    
    Includes full product info, all variants, images, reviews, and discounts.
    """
    id = serializers.IntegerField()
    name = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock = serializers.IntegerField()
    owner = serializers.IntegerField()
    owner_username = serializers.CharField(source='owner.username')
    created = serializers.DateTimeField()
    sold = serializers.BooleanField()
    negotiable = serializers.BooleanField()
    used = serializers.BooleanField()
    
    # Related data
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = ProductReviewSerializer(many=True, read_only=True)
    discounts = ProductDiscountSerializer(many=True, read_only=True)
    
    # Computed fields
    price_range = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    rating_summary = serializers.SerializerMethodField()
    active_discount = serializers.SerializerMethodField()

    def get_price_range(self, obj):
        """Price range across all variants"""
        variants = getattr(obj, 'variants', None)
        if variants and variants.filter(is_active=True).exists():
            prices = [float(v.price) for v in variants.filter(is_active=True)]
            return {"min": min(prices), "max": max(prices)}
        return {"min": float(obj.price), "max": float(obj.price)}

    def get_average_rating(self, obj):
        """Average rating across all reviews"""
        reviews = getattr(obj, 'reviews', None)
        if reviews:
            rating_list = [r.rating for r in reviews.all()]
            if rating_list:
                return round(sum(rating_list) / len(rating_list), 2)
        return None

    def get_rating_summary(self, obj):
        """
        Full rating breakdown.
        
        Example:
        {
            "average": 4.5,
            "total_reviews": 42,
            "breakdown": {
                "5": 25,
                "4": 12,
                "3": 3,
                "2": 2,
                "1": 0
            }
        }
        """
        reviews = getattr(obj, 'reviews', None)
        if reviews:
            reviews_list = list(reviews.all())
            if reviews_list:
                total = len(reviews_list)
                avg = sum(r.rating for r in reviews_list) / total
                breakdown = {str(i): sum(1 for r in reviews_list if r.rating == i) for i in range(1, 6)}
                return {
                    "average": round(avg, 2),
                    "total_reviews": total,
                    "breakdown": breakdown
                }
        return {"average": None, "total_reviews": 0, "breakdown": {}}

    def get_active_discount(self, obj):
        """
        Get active discount if any.
        
        Example:
        {
            "type": "percentage",
            "value": 20.00,
            "description": "Summer Sale"
        }
        """
        discounts = getattr(obj, 'discounts', None)
        if discounts:
            from django.utils.timezone import now
            for discount in discounts.filter(is_active=True):
                if discount.start_date <= now() <= discount.end_date:
                    return {
                        "type": discount.discount_type,
                        "value": float(discount.value),
                        "description": discount.description
                    }
        return None
