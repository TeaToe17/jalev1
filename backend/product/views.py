from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.db.models import Case, When, Value, DateTimeField

from .serializers import ProductSerializer, CategorySerialzer
from .models import Product, Category

class ProductCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer

    def create(self, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=self.request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(owner=self.request.user)

            return Response(serializer.data, status=201)
        except Exception as e:  
            return Response({"error": str(e)}, status=400)
        
class ProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        self.unstick_expired_products()

        queryset = Product.objects.annotate(
            effective_sort_date=Case(
                When(is_sticky=True, then='sticky_timestamp'),
                default='created',  # Removed the '-' here; sorting is handled below
                output_field=DateTimeField()
            )
        ).order_by('-is_sticky', '-effective_sort_date')

        url_id = self.kwargs.get("id")
        product_id = self.request.GET.get("product")
        user = self.request.user

        # Filter by owner ID if it's the current authenticated user
        if url_id and user.is_authenticated and int(url_id) == user.id:
            queryset = queryset.filter(owner__id=url_id)

        # Filter by specific product ID
        if product_id:
            queryset = queryset.filter(id=int(product_id))

        return queryset

    def unstick_expired_products(self):
        try:
            expiry_time = timezone.now() - timedelta(hours=2)
            updated_count = Product.objects.filter(
                is_sticky=True,
                sticky_timestamp__lt=expiry_time
            ).update(is_sticky=False, sticky_timestamp=None)

            if updated_count:
                print(f"{updated_count} sticky products unstuck.")
        except Exception as e:
            print("Error unsticking expired products:", e)
            


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
    serializer_class = CategorySerialzer
    queryset = Category.objects.all()