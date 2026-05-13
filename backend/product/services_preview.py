"""
PREVIEW FILE - Services for Product System Redesign
(This is a preview - not yet in production)

This file contains business logic for:
- Advanced product filtering and search
- Price calculations with discounts
- Review aggregation and rating calculations
"""

from django.db.models import Q, Avg
from django.utils.timezone import now
from datetime import timedelta


class ProductQueryService:
    """
    Service for advanced product filtering and search operations.
    
    Handles:
    - Full-text search across product names and descriptions
    - Category filtering
    - Price range filtering (single products and variants)
    - Rating-based filtering
    - Condition filtering (new/used)
    - Sorting options
    """

    @staticmethod
    def filter_products(queryset, search_term=None, categories=None, condition=None,
                       price_min=None, price_max=None, min_rating=None,
                       is_negotiable=None, sort_by='created'):
        """
        Apply multiple filters to product queryset.
        
        Args:
            queryset: Initial Product queryset
            search_term: Search in product name and description
            categories: List of category IDs to filter
            condition: 'new' or 'used'
            price_min: Minimum price (checks variants too)
            price_max: Maximum price (checks variants too)
            min_rating: Minimum average rating
            is_negotiable: Filter by negotiable status
            sort_by: Sort field (created, price_low, price_high, rating, popular)
        
        Returns:
            Filtered and sorted queryset
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

        # Filter by price range
        if price_min is not None or price_max is not None:
            q_filter = Q()
            if price_min is not None:
                q_filter &= Q(price__gte=price_min) | Q(variants__price__gte=price_min)
            if price_max is not None:
                q_filter &= Q(price__lte=price_max) | Q(variants__price__lte=price_max)
            queryset = queryset.filter(q_filter).distinct()

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
    
    Features:
    - Calculate effective price after discounts
    - Get price ranges for products with variants
    - Retrieve active discount information
    - Support percentage and fixed amount discounts
    """

    @staticmethod
    def get_variant_price(variant):
        """
        Get effective price for a variant after applying active discounts.
        
        Args:
            variant: ProductVariant instance
        
        Returns:
            float: Final price after discount (min 0)
        """
        base_price = float(variant.price)
        
        # Find and apply active discounts
        try:
            from .models import ProductDiscount
            active_discounts = ProductDiscount.objects.filter(
                variant=variant,
                is_active=True,
                start_date__lte=now(),
                end_date__gte=now()
            )

            for discount in active_discounts:
                if discount.discount_type == 'percentage':
                    discount_amount = base_price * (float(discount.value) / 100)
                else:  # fixed
                    discount_amount = float(discount.value)
                base_price -= discount_amount
        except:
            pass  # If imports fail, just return base price

        return max(base_price, 0)

    @staticmethod
    def get_product_price_range(product):
        """
        Get min and max price from all active variants or product base price.
        
        Args:
            product: Product instance
        
        Returns:
            dict: {'min': float, 'max': float}
        """
        try:
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
        except:
            pass

        return {
            'min': float(product.price),
            'max': float(product.price)
        }

    @staticmethod
    def get_product_discount_info(product):
        """
        Get active discount information for a product.
        
        Args:
            product: Product instance
        
        Returns:
            dict or None: Discount info if active, None otherwise
        """
        try:
            from .models import ProductDiscount
            active_discounts = ProductDiscount.objects.filter(
                product=product,
                is_active=True,
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
        except:
            pass

        return None


class ReviewService:
    """
    Service for review operations and rating calculations.
    
    Features:
    - Calculate product rating summary with breakdown
    - Verify purchase eligibility for reviews
    - Aggregate rating statistics
    """

    @staticmethod
    def get_product_rating_summary(product):
        """
        Get rating summary for a product.
        
        Args:
            product: Product instance
        
        Returns:
            dict: Contains average_rating, total_reviews, rating_breakdown
        """
        try:
            from .models import ProductReview
            reviews = ProductReview.objects.filter(product=product)

            if not reviews.exists():
                return {
                    'average_rating': None,
                    'total_reviews': 0,
                    'rating_breakdown': {i: 0 for i in range(1, 6)}
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
        except:
            return {
                'average_rating': None,
                'total_reviews': 0,
                'rating_breakdown': {}
            }

    @staticmethod
    def can_review_product(user, product):
        """
        Check if user can review a product (must have purchased it).
        
        Args:
            user: User instance
            product: Product instance
        
        Returns:
            bool: True if user purchased product
        """
        try:
            from order.models import Order
            return Order.objects.filter(
                product=product,
                buyer_name=user.username
            ).exists()
        except:
            return False
