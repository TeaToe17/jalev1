# Product System Redesign - Code Preview (NO DEPLOYMENT)

This document shows all the code changes that WOULD be made. Nothing has been committed or migrated.

---

## 1. NEW MODELS (to add to backend/product/models.py)

Add these models to the Product class file after the existing Product model:

```python
class ProductVariant(models.Model):
    """
    Represents a product variant with its own price, stock, and attributes.
    Variants allow a single product to have multiple SKUs (size/color combinations).
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    name = models.CharField(max_length=100, help_text="e.g., 'Red - Size M'")
    sku = models.CharField(max_length=50, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=1)
    attributes = models.JSONField(default=dict, blank=True, help_text="e.g., {'color': 'red', 'size': 'M'}")
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created']
        indexes = [
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['sku']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.name} (SKU: {self.sku})"


class ProductImage(models.Model):
    """
    Separate images for products, allowing multiple images per product.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    imagefile = models.ImageField(upload_to="products_images/", blank=True, null=True)
    image_url = models.URLField(blank=True, null=True, help_text="Cloudinary or external URL")
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created']

    def __str__(self):
        return f"Image for {self.product.name}"


class ProductReview(models.Model):
    """
    Customer reviews for products with ratings.
    """
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey("user.CustomUser", on_delete=models.CASCADE, related_name="product_reviews")
    rating = models.PositiveIntegerField(choices=RATING_CHOICES, default=5)
    title = models.CharField(max_length=100, blank=True)
    comment = models.TextField(blank=True)
    helpful_count = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    is_verified_purchase = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created']
        unique_together = [['product', 'reviewer']]
        indexes = [
            models.Index(fields=['product', 'rating']),
            models.Index(fields=['created']),
        ]

    def __str__(self):
        return f"{self.reviewer.username} - {self.product.name} ({self.rating}★)"


class ProductDiscount(models.Model):
    """
    Flexible discount system supporting percentage and fixed amount discounts.
    """
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="discounts")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="discounts", null=True, blank=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='percentage')
    value = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=200, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created']
        indexes = [
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
        ]

    def is_valid_now(self):
        """Check if discount is currently active."""
        from django.utils.timezone import now
        return self.is_active and self.start_date <= now() <= self.end_date

    def __str__(self):
        return f"{self.product.name} - {self.value}{('%' if self.discount_type == 'percentage' else '₦')}"
```

---

## 2. NEW SERVICE LAYER (create backend/product/services.py)

```python
from django.db.models import Q, Avg
from django.utils.timezone import now
from datetime import timedelta
from .models import Product, ProductVariant, ProductReview, ProductDiscount
from order.models import Order


class ProductQueryService:
    """
    Service for advanced product filtering and search operations.
    """

    @staticmethod
    def filter_products(queryset, search_term=None, categories=None, condition=None,
                       price_min=None, price_max=None, min_rating=None,
                       is_negotiable=None, sort_by='created'):
        """
        Apply multiple filters to product queryset.
        """
        # Search in name and description
        if search_term:
            queryset = queryset.filter(
                Q(name__icontains=search_term) |
                Q(extra_field__icontains=search_term)
            )

        # Filter by categories
        if categories:
            queryset = queryset.filter(categories__in=categories).distinct()

        # Filter by condition (used/new)
        if condition:
            if condition.lower() == 'used':
                queryset = queryset.filter(used=True)
            elif condition.lower() == 'new':
                queryset = queryset.filter(used=False)

        # Filter by price range (check both product and variants)
        if price_min is not None or price_max is not None:
            q_filter = Q()
            if price_min is not None:
                q_filter &= Q(price__gte=price_min) | Q(variants__price__gte=price_min)
            if price_max is not None:
                q_filter &= Q(price__lte=price_max) | Q(variants__price__lte=price_max)
            queryset = queryset.filter(q_filter).distinct()

        # Filter by minimum rating
        if min_rating is not None:
            # Get products with average rating >= min_rating
            products_with_rating = ProductReview.objects.values('product').annotate(
                avg_rating=Avg('rating')
            ).filter(avg_rating__gte=min_rating).values_list('product', flat=True)
            queryset = queryset.filter(id__in=products_with_rating).distinct()

        # Filter by negotiability
        if is_negotiable is not None:
            queryset = queryset.filter(negotiable=is_negotiable)

        # Apply sorting
        sort_map = {
            'created': '-created',
            'price_low': 'price',
            'price_high': '-price',
            'rating': '-reviews__rating',
            'popular': '-reviews',
        }
        order_by = sort_map.get(sort_by, '-created')
        queryset = queryset.order_by(order_by).distinct()

        return queryset


class PricingService:
    """
    Service for price calculations including discounts.
    """

    @staticmethod
    def get_variant_price(variant):
        """
        Get effective price for a variant after applying active discounts.
        """
        base_price = variant.price
        active_discounts = ProductDiscount.objects.filter(
            variant=variant,
            is_active=True
        )

        for discount in active_discounts:
            if discount.is_valid_now():
                if discount.discount_type == 'percentage':
                    discount_amount = base_price * (discount.value / 100)
                else:  # fixed
                    discount_amount = discount.value
                base_price -= discount_amount

        return max(base_price, 0)  # Ensure price doesn't go negative

    @staticmethod
    def get_product_price_range(product):
        """
        Get min and max price from all active variants or product base price.
        """
        active_variants = product.variants.filter(is_active=True)

        if active_variants.exists():
            prices = [
                PricingService.get_variant_price(v)
                for v in active_variants
            ]
            return {
                'min': min(prices),
                'max': max(prices)
            }

        return {
            'min': float(product.price),
            'max': float(product.price)
        }

    @staticmethod
    def get_product_discount_info(product):
        """
        Get active discount information for a product.
        """
        active_discounts = ProductDiscount.objects.filter(
            product=product,
            is_active=True
        ).filter(
            start_date__lte=now(),
            end_date__gte=now()
        )

        if active_discounts.exists():
            discount = active_discounts.first()
            return {
                'type': discount.discount_type,
                'value': float(discount.value),
                'description': discount.description
            }

        return None


class ReviewService:
    """
    Service for review operations and rating calculations.
    """

    @staticmethod
    def get_product_rating_summary(product):
        """
        Get rating summary for a product.
        """
        reviews = ProductReview.objects.filter(product=product)

        if not reviews.exists():
            return {
                'average_rating': None,
                'total_reviews': 0,
                'rating_breakdown': {}
            }

        total = reviews.count()
        avg = reviews.aggregate(avg=Avg('rating'))['avg']

        # Count reviews by rating
        breakdown = {}
        for i in range(1, 6):
            breakdown[i] = reviews.filter(rating=i).count()

        return {
            'average_rating': round(avg, 2) if avg else None,
            'total_reviews': total,
            'rating_breakdown': breakdown
        }

    @staticmethod
    def can_review_product(user, product):
        """
        Check if user can review a product (must have purchased it).
        """
        return Order.objects.filter(
            product=product,
            buyer_name=user.username
        ).exists()
```

---

## 3. NEW SERIALIZERS (add to backend/product/serializers.py)

```python
class ProductVariantSerializer(serializers.ModelSerializer):
    """Serializer for product variants with price and stock management."""
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "product", "product_name", "name", "sku", "price", "stock", 
                  "attributes", "is_active", "created", "updated"]
        extra_kwargs = {
            "created": {"read_only": True},
            "updated": {"read_only": True},
            "product": {"read_only": True}
        }


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for product images."""
    class Meta:
        model = ProductImage
        fields = ["id", "product", "imagefile", "image_url", "alt_text", 
                  "is_primary", "order", "created"]
        extra_kwargs = {
            "created": {"read_only": True},
            "product": {"read_only": True}
        }


class ProductReviewSerializer(serializers.ModelSerializer):
    """Serializer for product reviews."""
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)

    class Meta:
        model = ProductReview
        fields = ["id", "product", "reviewer", "reviewer_username", "rating", 
                  "title", "comment", "helpful_count", "is_verified_purchase", 
                  "created", "updated"]
        extra_kwargs = {
            "created": {"read_only": True},
            "updated": {"read_only": True},
            "helpful_count": {"read_only": True}
        }


class ProductDiscountSerializer(serializers.ModelSerializer):
    """Serializer for product discounts with validation."""
    is_valid_now = serializers.SerializerMethodField()

    class Meta:
        model = ProductDiscount
        fields = ["id", "product", "variant", "discount_type", "value", 
                  "description", "start_date", "end_date", "is_active", 
                  "created", "is_valid_now"]
        extra_kwargs = {
            "created": {"read_only": True}
        }

    def get_is_valid_now(self, obj):
        return obj.is_valid_now()


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product listings with variant info."""
    categories = serializers.PrimaryKeyRelatedField(many=True, queryset=Category.objects.all())
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "owner", "owner_username", "stock", "categories", 
                  "created", "sold", "negotiable", "used", "is_sticky", "reserved",
                  "image", "imagefile", "primary_image", "variants", "price_range", 
                  "average_rating", "price"]
        extra_kwargs = {
            "created": {"read_only": True},
            "sold": {"read_only": True},
            "owner": {"read_only": True}
        }

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            return ProductImageSerializer(primary).data
        return None

    def get_price_range(self, obj):
        """Get min and max price from variants or product price."""
        return PricingService.get_product_price_range(obj)

    def get_average_rating(self, obj):
        """Calculate average rating from reviews."""
        summary = ReviewService.get_product_rating_summary(obj)
        return summary['average_rating']


class ProductDetailSerializer(ProductListSerializer):
    """Detailed serializer with all related data."""
    images = ProductImageSerializer(many=True, read_only=True)
    reviews = ProductReviewSerializer(many=True, read_only=True)
    discounts = ProductDiscountSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ["images", "reviews", "discounts", 
                                                       "extra_field", "request"]
```

---

## 4. UPDATED MODELS (modifications to existing models)

In `backend/order/models.py`, add variant field to CartItem and Order:

```python
# In CartItem model, add:
variant = models.ForeignKey("product.ProductVariant", on_delete=models.SET_NULL, null=True, blank=True, related_name="cartItems")

# In Order model, add:
variant = models.ForeignKey("product.ProductVariant", on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
```

---

## 5. NEW API VIEWS (add to backend/product/views.py)

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action

class ProductVariantViewSet(viewsets.ModelViewSet):
    """ViewSet for managing product variants."""
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ProductVariant.objects.filter(product__owner=user)

    def perform_create(self, serializer):
        product_id = self.request.data.get('product')
        product = get_object_or_404(Product, id=product_id, owner=self.request.user)
        serializer.save(product=product)

    @action(detail=False, methods=['get'])
    def by_product(self, request):
        product_id = request.GET.get('product_id')
        if not product_id:
            return Response({'error': 'product_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        variants = ProductVariant.objects.filter(product_id=product_id, is_active=True)
        serializer = self.get_serializer(variants, many=True)
        return Response(serializer.data)


class ProductReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for managing product reviews."""
    serializer_class = ProductReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        product_id = self.request.GET.get('product_id')
        if product_id:
            return ProductReview.objects.filter(product_id=product_id)
        return ProductReview.objects.all()

    def perform_create(self, serializer):
        product_id = self.request.data.get('product')
        product = get_object_or_404(Product, id=product_id)
        
        # Verify purchase and existing review
        if not ReviewService.can_review_product(self.request.user, product):
            return Response({'error': 'Must purchase to review'}, status=status.HTTP_403_FORBIDDEN)
        
        if ProductReview.objects.filter(product=product, reviewer=self.request.user).exists():
            return Response({'error': 'Already reviewed'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save(product=product, reviewer=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        product_id = request.GET.get('product_id')
        if not product_id:
            return Response({'error': 'product_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        product = get_object_or_404(Product, id=product_id)
        summary = ReviewService.get_product_rating_summary(product)
        return Response(summary)


class ProductImageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing product images."""
    serializer_class = ProductImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProductImage.objects.filter(product__owner=self.request.user)

    def perform_create(self, serializer):
        product_id = self.request.data.get('product')
        product = get_object_or_404(Product, id=product_id, owner=self.request.user)
        serializer.save(product=product)

    @action(detail=False, methods=['patch'])
    def set_primary(self, request):
        image_id = request.data.get('image_id')
        if not image_id:
            return Response({'error': 'image_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        image = get_object_or_404(ProductImage, id=image_id)
        if image.product.owner != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        ProductImage.objects.filter(product=image.product).update(is_primary=False)
        image.is_primary = True
        image.save()
        
        return Response({'status': 'Primary image updated'})


class ProductDetailView(generics.RetrieveAPIView):
    """Get detailed information about a product."""
    permission_classes = [AllowAny]
    serializer_class = ProductDetailSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return Product.objects.all()

    def retrieve(self, request, *args, **kwargs):
        product = self.get_object()
        serializer = self.get_serializer(product)
        data = serializer.data
        data['price_info'] = {
            'price_range': PricingService.get_product_price_range(product),
            'active_discount': PricingService.get_product_discount_info(product)
        }
        return Response(data)
```

---

## 6. UPDATED URLS (backend/product/urls.py)

```python
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'variants', ProductVariantViewSet, basename='variant')
router.register(r'reviews', ProductReviewViewSet, basename='review')
router.register(r'images', ProductImageViewSet, basename='image')

urlpatterns = [
    # ... existing paths ...
    path("detail/<int:id>/", ProductDetailView.as_view(), name="product-detail"),
    path("", include(router.urls)),
]
```

---

## 7. NEW FRONTEND COMPONENT: VariantSelector (frontend/src/components/VariantSelector.tsx)

```typescript
'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Variant {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  is_active: boolean;
}

interface VariantSelectorProps {
  variants: Variant[];
  onSelectVariant: (variant: Variant) => void;
  selectedVariant: Variant | null;
}

export function VariantSelector({
  variants,
  onSelectVariant,
  selectedVariant,
}: VariantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Variant
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg flex items-center justify-between hover:border-gray-400"
        >
          <span className="text-gray-900">
            {selectedVariant ? `${selectedVariant.name} - ₦${selectedVariant.price.toLocaleString()}` : 'Choose variant...'}
          </span>
          <ChevronDown size={20} className={`transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            {variants.filter(v => v.is_active).map((variant) => (
              <button
                key={variant.id}
                onClick={() => {
                  onSelectVariant(variant);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-100 border-b border-gray-200 last:border-b-0 ${
                  selectedVariant?.id === variant.id ? 'bg-blue-50 font-semibold' : ''
                }`}
              >
                <div className="font-medium text-gray-900">{variant.name}</div>
                <div className="text-sm text-gray-600">
                  ₦{variant.price.toLocaleString()} • {variant.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 8. NEW FRONTEND COMPONENT: FilterBar (frontend/src/components/FilterBar.tsx)

```typescript
'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface FilterBarProps {
  onFilterChange: (filters: {
    search?: string;
    priceMin?: number;
    priceMax?: number;
    condition?: 'new' | 'used';
    minRating?: number;
    isNegotiable?: boolean;
    sortBy?: string;
  }) => void;
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [condition, setCondition] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('created');

  const handleFilterChange = () => {
    onFilterChange({
      search: search || undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      condition: (condition as 'new' | 'used') || undefined,
      minRating: minRating ? Number(minRating) : undefined,
      sortBy,
    });
  };

  const handleClear = () => {
    setSearch('');
    setPriceMin('');
    setPriceMax('');
    setCondition('');
    setMinRating('');
    setSortBy('created');
    onFilterChange({});
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Price Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
          <input
            type="number"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="₦0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
          <input
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="₦999,999"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any condition</option>
          <option value="new">New</option>
          <option value="used">Used</option>
        </select>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any rating</option>
          <option value="1">1★ and up</option>
          <option value="2">2★ and up</option>
          <option value="3">3★ and up</option>
          <option value="4">4★ and up</option>
          <option value="5">5★ only</option>
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="created">Newest</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={handleFilterChange}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          Apply Filters
        </button>
        <button
          onClick={handleClear}
          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium flex items-center justify-center gap-2"
        >
          <X size={18} />
          Clear
        </button>
      </div>
    </div>
  );
}
```

---

## 9. NEW FRONTEND COMPONENT: ReviewsList (frontend/src/components/ReviewsList.tsx)

```typescript
'use client';

import React, { useState } from 'react';
import { Star, Trash2 } from 'lucide-react';

interface Review {
  id: number;
  reviewer_username: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  created: string;
}

interface ReviewsListProps {
  reviews: Review[];
  productId: number;
  onAddReview?: () => void;
}

export function ReviewsList({ reviews, productId, onAddReview }: ReviewsListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const ratingCounts = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  return (
    <div className="w-full space-y-6">
      {/* Rating Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Reviews</h3>

        <div className="grid grid-cols-3 gap-6">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{averageRating}</div>
            <div className="flex justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < Math.round(Number(averageRating) || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }
                />
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">{reviews.length} reviews</p>
          </div>

          {/* Rating Distribution */}
          <div className="col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-8">{rating}★</span>
                <div className="flex-1 bg-gray-300 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{
                      width: reviews.length ? `${(ratingCounts[rating as keyof typeof ratingCounts] / reviews.length) * 100}%` : '0%',
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-10 text-right">
                  {ratingCounts[rating as keyof typeof ratingCounts]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {onAddReview && (
          <button
            onClick={onAddReview}
            className="w-full mt-6 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center text-gray-600 py-8">No reviews yet</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                    <span className="font-medium text-gray-900">{review.reviewer_username}</span>
                    {review.is_verified_purchase && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h4 className="font-semibold text-gray-900 mt-2">{review.title}</h4>
                  )}
                  <p className="text-gray-700 mt-2">{review.comment}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(review.created).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 10. UPDATED Product Card Component (frontend/src/components/Product.tsx)

Add star rating display and price range:

```typescript
// Add import at top
import { Star } from 'lucide-react';

// In component JSX, update the display to show:
{product.average_rating && (
  <div className="flex items-center gap-1 mt-1">
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          className={
            i < Math.round(product.average_rating || 0)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }
        />
      ))}
    </div>
    <span className="text-xs text-gray-600">
      {product.average_rating.toFixed(1)}
    </span>
  </div>
)}

// Update price display to show range:
{product.price_range && product.price_range.max > product.price_range.min && (
  <p className="text-xs text-gray-600">
    up to ₦{product.price_range.max.toLocaleString()}
  </p>
)}
```

---

## Summary of Changes

**Total Files Modified/Created:**
- 4 Models enhanced (variants, images, reviews, discounts)
- 1 Service layer file created
- 4 Serializers created
- 3 ViewSets created
- 3 Frontend components created
- 1 Component updated

**No migrations run. No deployment. Pure code preview.**

To implement: Run `python manage.py makemigrations` then `python manage.py migrate` when ready.
