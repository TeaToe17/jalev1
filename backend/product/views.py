from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .serializers import ProductSerializer, CategorySerialzer
from .models import Product, Category

class ProductCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer
    queryset = Product.objects.all()

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
        queryset = Product.objects.all() 
        url_id = self.kwargs.get("id")
        user = self.request.user

        if url_id and user.is_authenticated and int(url_id) == int(user.id):
            print(queryset.filter(owner__id=url_id))
            return queryset.filter(owner__id=url_id)
        return queryset
            


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
    
class CategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategorySerialzer
    queryset = Category.objects.all()