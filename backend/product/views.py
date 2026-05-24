# from rest_framework import generics
# from rest_framework.permissions import IsAuthenticated, AllowAny
# from rest_framework.response import Response
# from rest_framework.views import APIView
# from django.utils import timezone
# from datetime import timedelta
# from django.shortcuts import get_object_or_404
# from django.db.models import Case, When, Value, DateTimeField, IntegerField

# from .serializers import ProductSerializer, CategorySerialzer
# from .models import Product, Category

# class ProductCreateView(generics.CreateAPIView):
#     permission_classes = [IsAuthenticated]
#     serializer_class = ProductSerializer

#     def create(self, *args, **kwargs):
#         try:
#             serializer = self.get_serializer(data=self.request.data)
#             serializer.is_valid(raise_exception=True)
#             serializer.save(owner=self.request.user)

#             return Response(serializer.data, status=201)
#         except Exception as e:  
#             return Response({"error": str(e)}, status=400)
        
# class ProductListView(generics.ListAPIView):
#     permission_classes = [AllowAny]
#     serializer_class = ProductSerializer

#     def get_queryset(self):
#         self.unstick_expired_products()

#         queryset = Product.objects.annotate(
#             effective_sort_date=Case(
#                 When(is_sticky=True, then='sticky_timestamp'),
#                 default='created',
#                 output_field=DateTimeField()
#             ),
#             is_available=Case(
#                 When(sold=False, stock__gt=0, then=Value(1)),
#                 default=Value(0),
#                 output_field=IntegerField()
#             )
#         ).order_by('-is_available', '-is_sticky', '-effective_sort_date')

#         url_id = self.kwargs.get("id")
#         product_id = self.request.GET.get("product")
#         user = self.request.user

#         # Filter by owner ID if it's the current authenticated user
#         if url_id and user.is_authenticated and int(url_id) == user.id:
#             queryset = queryset.filter(owner__id=url_id)

#         # Filter by specific product ID
#         if product_id:
#             queryset = queryset.filter(id=int(product_id))

#         return queryset

#     def unstick_expired_products(self):
#         try:
#             expiry_time = timezone.now() - timedelta(hours=2)
#             updated_count = Product.objects.filter(
#                 is_sticky=True,
#                 sticky_timestamp__lt=expiry_time
#             ).update(is_sticky=False, sticky_timestamp=None)

#             if updated_count:
#                 print(f"{updated_count} sticky products unstuck.")
#         except Exception as e:
#             print("Error unsticking expired products:", e)            

# class ProductUpdateView(generics.UpdateAPIView):
#     serializer_class = ProductSerializer
#     permission_classes = [IsAuthenticated]
#     lookup_field = "id"

#     def get_queryset(self):
#         user = self.request.user
#         return Product.objects.filter(owner=user)
    
# class ProductDeleteView(generics.DestroyAPIView):
#     permission_classes = [IsAuthenticated]
#     serializer_class = ProductSerializer
#     lookup_field = "id"

#     def get_queryset(self):
#         user = self.request.user
#         return Product.objects.filter(owner=user)

# class MakeProductStickyView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request, product_id):
#         user = request.user
#         product = get_object_or_404(Product, id=product_id, owner=user)

#         if user.referral_points < 1:
#             return Response({"message": "Not enough referral points."}, status=400)

#         if product.is_sticky:
#             return Response({"message": "Product is already sticky."}, status=400)

#         product.is_sticky = True
#         product.sticky_timestamp = timezone.now()
#         user.referral_points -= 1

#         user.save()
#         product.save()

#         return Response({"message": "Product saved as sticky."}, status=200)
    
# class CategoryListView(generics.ListAPIView):
#     permission_classes = [AllowAny]
#     serializer_class = CategorySerialzer
#     queryset = Category.objects.all()

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.db.models import Case, When, Value, DateTimeField, IntegerField

from .serializers import ProductSerializer, ProductListSerializer, CategorySerializer, ProductVariantSerializer
from .models import Product, Category, ProductVariant

class ProductCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(owner=request.user)
            return Response(serializer.data, status=201)
        except Exception as e:  
            return Response({"error": str(e)}, status=400)
        
class ProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductListSerializer

    def get_queryset(self):
        self.unstick_expired_products()

        # Sort based directly on chosen representative preferred variant configuration parameters
        queryset = Product.objects.select_related('preferred_variant').prefetch_related('categories').annotate(
            effective_sort_date=Case(
                When(is_sticky=True, then='sticky_timestamp'),
                default='created',
                output_field=DateTimeField()
            ),
            is_available=Case(
                When(
                    preferred_variant__sold=False, 
                    preferred_variant__stock__gt=0, 
                    then=Value(1)
                ),
                default=Value(0),
                output_field=IntegerField()
            )
        ).order_by('-is_available', '-is_sticky', '-effective_sort_date')

        url_id = self.kwargs.get("id")
        user = self.request.user

        if url_id and user.is_authenticated and int(url_id) == user.id:
            queryset = queryset.filter(owner__id=url_id)

        return queryset

    def unstick_expired_products(self):
        try:
            expiry_time = timezone.now() - timedelta(hours=2)
            Product.objects.filter(is_sticky=True, sticky_timestamp__lt=expiry_time).update(is_sticky=False, sticky_timestamp=None)
        except Exception as e:
            print("Error unsticking expired products:", e)            

class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    queryset = Product.objects.all().prefetch_related('variants', 'categories')
    lookup_field = "id"

class ProductUpdateView(generics.UpdateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user
        return Product.objects.filter(owner=user)

class ProductDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user
        return Product.objects.filter(owner=user)

class MakeProductStickyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        user = request.user
        product = get_object_or_404(Product, id=product_id, owner=user)

        if user.referral_points < 1:
            return Response({"message": "Not enough referral points."}, status=400)

        if product.is_sticky:
            return Response({"message": "Product is already sticky."}, status=400)

        product.is_sticky = True
        product.sticky_timestamp = timezone.now()
        user.referral_points -= 1

        user.save()
        product.save()

        return Response({"message": "Product saved as sticky."}, status=200)  

class CategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    queryset = Category.objects.all()

class ProductVariantDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductVariantSerializer
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user
        return ProductVariant.objects.filter(product__owner=user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        product = instance.product

        if product.variants.count() <= 1:
            return Response({"detail":"The last variant cannot be deleted. Delete the product instead."},
                             status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)