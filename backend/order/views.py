
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import OrderSerializer, CartItemSerializer
from .models import Order, CartItem
from product.models import Product
from product.tasks import send_email

class OrderCreateView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = OrderSerializer
    queryset = Order.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data = self.request.data)
        serializer.is_valid(raise_exception=True)

        agreed_price = serializer.validated_data.get("agreed_price")
        product_data = serializer.validated_data.get("product")

        # If `product_data` is an ID, use it directly. If it's an object, get the ID.
        product_id = product_data.id if hasattr(product_data, "id") else int(product_data)
        product = Product.objects.get(id=product_id)

        # Reserve product when stock is low to prevent over-ordering, 
        # but don’t mark as sold immediately in case of rejections,
        # check order views for sold flagging.
        product.reserved = product.stock <= 1
        product.save()

        if not agreed_price:
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
            send_email("titobiloluwaa84@gmail.com", subject, message)
            return Response(serializer.data, status=201)
        except Exception as e:
            return Response({"error":str(e)}, status=400)

class OrderListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    queryset = Order.objects.all()

    def get_queryset(self):
        return Order.objects.filter(buyer_name = self.request.user.username).order_by("-date_created")

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
            product.__class__.objects.filter(id=product.id).update(quantity=0, sold=True)

        super().perform_destroy(instance)

        # if hasattr(product, 'request') and product.request is not None:
        #     product.request.delete()

class CreateBatchOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        created_orders = []  # Store each created order

        for item in request.data:

            try:
                product = Product.objects.get(id=int(item["product_id"]))
            except Product.DoesNotExist:
                return Response({"error": f"Product {item['product_id']} not found."}, status=400)
            
            cartItem = CartItem.objects.filter(product=product, owner=user).first()

            quantity = int(item.get("quantity", 1))

            if product.stock < quantity:
                return Response({"detail": f"Insufficient stock for {product.name}."}, status=400)

            order = Order.objects.create(
                product=product,
                buyer_name=user.username,
                buyer_whatsapp_contact=user.whatsapp,
                buyer_call_contact=user.call,
                agreed_price=product.price,
                quantity = quantity,
            )
            created_orders.append(order)
            if cartItem:
                cartItem.delete()

            # Reserve product when stock is low to prevent over-ordering, 
            # but don’t mark as sold immediately in case of rejections,
            # check order views for sold flagging.
            product.reserved = product.stock <= 1
            product.save()

        # Build message in a table-like format
        if created_orders:
            try:
                message_lines = ["BATCH ORDER SUMMARY\n"]
                message_lines.append(
                    "Product\t|\tBuyer\t|\tBuyer WhatsApp\t|\tOwner\t|\tOwner WhatsApp\n"
                )
                message_lines.append("-" * 90)

                for order in created_orders:
                    line = f"{order.product.name}\t|\t{order.buyer_name}\t|\t{order.buyer_whatsapp_contact}\t|\t{order.product.owner.username}\t|\t{order.product.owner.whatsapp}"
                    message_lines.append(line)

                message_body = "\n".join(message_lines)

                subject = f"{len(created_orders)} Orders Created by {user.username}"
                send_email("titobiloluwaa84@gmail.com", subject, message_body)
            except Exception as e:
                print("Error sending mail", e)

        return Response({"message": "Orders created successfully"}, status=200)
    
class CreateCartItem(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartItemSerializer
    queryset = CartItem.objects.all()

    def create(self, request, *args, **kwargs):
        user = request.user
        product_id = request.data.get("product")

        # Validate product exists
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Product does not exist"}, status=status.HTTP_400_BAD_REQUEST)

        # Check for existing cart item
        if CartItem.objects.filter(owner=user, product=product).exists():
            return Response({"message": "Product already in cart"}, status=status.HTTP_200_OK)

        # Create new cart item
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(owner=user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

        


class ListCartItem(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartItemSerializer

    def get_queryset(self):
        return CartItem.objects.filter(owner=self.request.user).order_by("-timestamp")

class UpdateCartItem(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartItemSerializer
    lookup_field = "id"

    def get_queryset(self):
        return CartItem.objects.filter(owner = self.request.user)
    
class DeleteCartItem(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartItemSerializer
    lookup_field = "id"

    def get_queryset(self):
        return CartItem.objects.filter(owner=self.request.user)
