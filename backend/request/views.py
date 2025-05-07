
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .serializers import RequestSerializer
from .models import Request
from product.models import Product

class RequestCreateView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RequestSerializer
    queryset = Request.objects.all()

    def create(self, request):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # ✅ Pass the user to the save() method
            
            return Response(serializer.data, status=201)

        except Exception as e:
            return Response({"error": str(e)}, status=400)

class RequestListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = RequestSerializer

    def get_queryset(self):
        Request.delete_old_requests()
        return Request.objects.all()
    

class RequestDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RequestSerializer
    lookup_field = "id"

    def get_queryset(self):
        # Get the current user's books
        seller_products = Product.objects.filter(owner=self.request.user)
        
        # Extract the related Request IDs from these books
        request_ids = seller_products.values_list('request__id', flat=True)
        
        # Return Request objects matching those IDs
        return Request.objects.filter(id__in=request_ids)