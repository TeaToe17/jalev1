"""
PREVIEW FILE - New Models for Product System Redesign
(This is a preview - not yet in production)

These models add:
1. ProductVariant - SKU-level variants with individual pricing
2. ProductImage - Product gallery management
3. ProductReview - Customer reviews with ratings
4. ProductDiscount - Time-based promotional pricing
"""

from django.db import models
from django.utils.timezone import now


class ProductVariant(models.Model):
    """
    Represents a product variant with its own price, stock, and attributes.
    
    Example: A T-shirt product might have variants like:
    - Red - Size M (price: 5000, stock: 50)
    - Red - Size L (price: 5500, stock: 30)
    - Blue - Size M (price: 5000, stock: 25)
    
    This allows flexible pricing and stock management per combination.
    """
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name="variants")
    name = models.CharField(
        max_length=100,
        help_text="e.g., 'Red - Size M' or 'Silver 64GB'"
    )
    sku = models.CharField(
        max_length=50,
        unique=True,
        help_text="Stock Keeping Unit - unique identifier"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Base price for this variant"
    )
    stock = models.PositiveIntegerField(
        default=1,
        help_text="Quantity available"
    )
    attributes = models.JSONField(
        default=dict,
        blank=True,
        help_text="e.g., {'color': 'red', 'size': 'M', 'material': 'cotton'}"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Toggle to disable/enable variant"
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created']
        indexes = [
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['sku']),
        ]
        verbose_name = "Product Variant"
        verbose_name_plural = "Product Variants"

    def __str__(self):
        return f"{self.product.name} - {self.name} (SKU: {self.sku})"


class ProductImage(models.Model):
    """
    Separate images for products, allowing multiple images per product.
    
    Supports:
    - File uploads (stored on server)
    - External URLs (Cloudinary, etc.)
    - Primary image selection
    - Custom ordering
    """
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name="images")
    imagefile = models.ImageField(
        upload_to="products_images/",
        blank=True,
        null=True,
        help_text="Upload image file"
    )
    image_url = models.URLField(
        blank=True,
        null=True,
        help_text="Or provide external URL (Cloudinary, AWS S3, etc.)"
    )
    alt_text = models.CharField(
        max_length=200,
        blank=True,
        help_text="Description for accessibility and SEO"
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="Set as main product image"
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order in gallery"
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created']
        verbose_name = "Product Image"
        verbose_name_plural = "Product Images"

    def __str__(self):
        return f"Image for {self.product.name}"

    @property
    def url(self):
        """Get the URL of the image (prioritizes external URL)"""
        return self.image_url or (self.imagefile.url if self.imagefile else None)


class ProductReview(models.Model):
    """
    Customer reviews for products with ratings.
    
    Features:
    - 1-5 star ratings
    - Verified purchase badge
    - One review per user per product
    - Helpful count tracking
    """
    RATING_CHOICES = [(i, f"{i} Star{'s' if i != 1 else ''}") for i in range(1, 6)]

    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(
        "user.CustomUser",
        on_delete=models.CASCADE,
        related_name="product_reviews"
    )
    rating = models.PositiveIntegerField(
        choices=RATING_CHOICES,
        default=5,
        help_text="Product rating"
    )
    title = models.CharField(
        max_length=100,
        blank=True,
        help_text="Review summary e.g. 'Great quality, fast delivery'"
    )
    comment = models.TextField(
        blank=True,
        help_text="Detailed review"
    )
    helpful_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of users who found helpful"
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    is_verified_purchase = models.BooleanField(
        default=False,
        help_text="Automatically set if reviewer purchased product"
    )

    class Meta:
        ordering = ['-created']
        unique_together = [['product', 'reviewer']]  # One review per user per product
        indexes = [
            models.Index(fields=['product', 'rating']),
            models.Index(fields=['created']),
        ]
        verbose_name = "Product Review"
        verbose_name_plural = "Product Reviews"

    def __str__(self):
        return f"{self.reviewer.username} - {self.product.name} ({self.rating}★)"


class ProductDiscount(models.Model):
    """
    Flexible discount system supporting percentage and fixed amount discounts.
    
    Features:
    - Percentage discounts (e.g., 20% off)
    - Fixed amount discounts (e.g., ₦5000 off)
    - Time-based activation (start and end dates)
    - Apply to entire product or specific variant
    
    Example:
    - "Summer Sale: 30% off all variants"
    - "Flash Deal: ₦2000 off Red Size M variant"
    """
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage (%)'),
        ('fixed', 'Fixed Amount (₦)'),
    ]

    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name="discounts")
    variant = models.ForeignKey(
        'ProductVariant',
        on_delete=models.CASCADE,
        related_name="discounts",
        null=True,
        blank=True,
        help_text="Leave blank to apply discount to all variants"
    )
    discount_type = models.CharField(
        max_length=10,
        choices=DISCOUNT_TYPE_CHOICES,
        default='percentage'
    )
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Discount value (percentage or amount)"
    )
    description = models.CharField(
        max_length=200,
        blank=True,
        help_text="e.g., 'Summer Sale' or 'Flash Deal'"
    )
    start_date = models.DateTimeField(
        help_text="When discount becomes active"
    )
    end_date = models.DateTimeField(
        help_text="When discount expires"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Toggle to pause/resume discount"
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created']
        indexes = [
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
        ]
        verbose_name = "Product Discount"
        verbose_name_plural = "Product Discounts"

    def is_valid_now(self):
        """Check if discount is currently active."""
        return (
            self.is_active and
            self.start_date <= now() <= self.end_date
        )

    def calculate_discount_amount(self, price):
        """
        Calculate discount amount for a given price.
        
        Args:
            price: Base price
        
        Returns:
            float: Discount amount
        """
        if self.discount_type == 'percentage':
            return price * (float(self.value) / 100)
        else:
            return float(self.value)

    def __str__(self):
        suffix = '%' if self.discount_type == 'percentage' else '₦'
        return f"{self.product.name} - {self.value}{suffix}"
