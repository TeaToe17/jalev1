
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from .serializers import OrderSerializer
from .models import Order
from product.models import Product
from product.tasks import send_email

class OrderCreateView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = OrderSerializer
    queryset = Order.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agreed_price = serializer.validated_data.get("agreed_price")
        product_data = serializer.validated_data.get("product")

        if not agreed_price:
            # If `product_data` is an ID, use it directly. If it's an object, get the ID.
            product_id = product_data.id if hasattr(product_data, "id") else int(product_data)
            product = Product.objects.get(id=product_id)
            price = product.price
            order = serializer.save(agreed_price=price)
        else:
            order = serializer.save()
        try:
            subject = f"New Order Created {order.id}"
            message = f"""Name of Product: {order.product.name},
                        Buyer's name: {order.buyer_name},
                        Buyer's WhatsApp: {order.buyer_whatsapp_contact},
                        Buyer's call line: {order.buyer_call_contact},
                        Owner's name: {order.product.owner.username},
                        Owner's WhatsApp: {order.product.owner.whatsapp},
                        Owner's call line: {order.product.owner.call},
                        """
            send_email.delay("titobiloluwaa84@gmail.com", subject, message)
            return Response(serializer.data, status=201)
        except Exception as e:
            return Response({"error":str(e)}, status=400)

class OrderListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    queryset = Order.objects.all()
    

class OrderDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = OrderSerializer
    queryset = Order.objects.all()
    lookup_field = "id"

    def perform_destroy(self, instance):
        product = instance.product  

        if product.quantity > 1:
            product.__class__.objects.filter(id=product.id).update(quantity=product.quantity - 1)
        elif product.quantity == 1:
            product.__class__.objects.filter(id=product.id).update(quantity=0, status="sold")

        super().perform_destroy(instance)


        # if hasattr(product, 'request') and product.request is not None:
        #     product.request.delete()