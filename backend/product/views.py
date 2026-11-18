import uuid, requests, json, hmac, hashlib, logging, time
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .pagination import ProductPagination


from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils.timezone import now
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.db.models import (
    Case,
    When,
    Value,
    DateTimeField,
    IntegerField,
    Prefetch,
    F
)

from .serializers import (
    ProductSerializer,
    ProductListSerializer,
    CategorySerializer,
    ProductVariantSerializer
)

from .models import Product, Category, ProductVariant, ClearancePayment, ClearancePaymentItem
from .utils import calculate_monthly_click_bill
from .payment_services import (
    reconcile_stale_pending_payments,
    verify_and_reconcile_payment,
)


class ProductCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer

    def create(self, request, *args, **kwargs):
        user = request.user
        cutoff = timezone.now() - timedelta(days=30)
        MINIMUM_BILL = 1000

        overdue_products = Product.objects.filter(
            owner=user,
            cleared=False,
            delist=True,
            lastclearance__lte=cutoff,
            preferred_variant__price__gte=100000,
        ).values_list(
            "chargeable_clicks",
            "preferred_variant__price",
        )

        clearance_required = False

        for chargeable_clicks, product_price in overdue_products:
            result = calculate_monthly_click_bill(
                eligible_clicks=int(chargeable_clicks or 0),
                product_price=float(product_price),
            )

            if result["bill"] >= MINIMUM_BILL:
                clearance_required = True
                break

        if clearance_required:
            return Response(
                {
                    "detail": (
                        "You cannot create new products while you have "
                        "an uncleared high-risk product that has exceeded "
                        "the 30-day clearance period and accumulated "
                        "the minimum required bill. Complete the required "
                        "clearance first."
                    ),
                    "clearance_required": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

class ProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductListSerializer
    pagination_class = ProductPagination

    def list(self, request, *args, **kwargs):

        # Opportunistically reconcile a small batch of pending
        # clearance payments whenever the product list is accessed.
        try:
            reconcile_stale_pending_payments(
                batch_size=3,
            )

        except Exception:
            print(
                "Product-list payment reconciliation failed."
            )

        response = super().list(request, *args, **kwargs)

        # Attach billing summary only to seller high-value requests.
        if getattr(self, "is_high_value_request", False):
            response.data["total_monthly_bill"] = (
                self.total_monthly_bill
            )

        return response

    def get_queryset(self):
        self.unstick_expired_products()
        self.delist_expired_high_risk_products()

        url_id = self.request.query_params.get("id")
        high_value = self.request.query_params.get("highValue", "").lower()
        user = self.request.user

        self.is_high_value_request = (
            url_id
            and user.is_authenticated
            and str(url_id) == str(user.id)
            and high_value == "true"
        )

        self.total_monthly_bill = 0

        # Seller-specific high-value products, including delisted ones
        if self.is_high_value_request:
            queryset = Product.objects.filter(
                owner__id=url_id,
                variants__price__gte=100000,
            ).select_related("preferred_variant").distinct()

            # Only products whose clearance period has elapsed
            cutoff = timezone.now() - timedelta(days=30)

            billing_products = queryset.filter(
                lastclearance__lte=cutoff
            )

            # Calculate the total bill for products meeting BOTH conditions
            for chargeable_clicks, product_price in billing_products.values_list(
                "chargeable_clicks",
                "preferred_variant__price",
            ):
                if chargeable_clicks and product_price:
                    result = calculate_monthly_click_bill(
                        eligible_clicks=chargeable_clicks,
                        product_price=float(product_price),
                    )

                    bill = result["bill"]

                    if bill >= 1000:
                        self.total_monthly_bill += bill

        else:
            queryset = Product.objects.filter(delist=False)

            if url_id and user.is_authenticated and str(url_id) == str(user.id):
                queryset = queryset.filter(owner__id=url_id)

        queryset = (
            queryset
            .select_related("preferred_variant")
            .prefetch_related("categories")
            .annotate(
                effective_sort_date=Case(
                    When(is_sticky=True, then="sticky_timestamp"),
                    default="created",
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
            )
            .order_by(
                "-is_available",
                "-is_sticky",
                "-effective_sort_date",
                "-id"
            )
        )

        search = self.request.query_params.get("search")
        category = self.request.query_params.get("category")

        if search:
            queryset = queryset.filter(name__icontains=search)

        if category:
            queryset = queryset.filter(categories__id=category).distinct()

        return queryset

    def unstick_expired_products(self):
        try:
            expiry_time = timezone.now() - timedelta(hours=2)

            Product.objects.filter(
                is_sticky=True,
                sticky_timestamp__lt=expiry_time
            ).update(
                is_sticky=False,
                sticky_timestamp=None
            )

        except Exception as e:
            print("Error unsticking expired products:", e)


    def delist_expired_high_risk_products(self):
        cutoff = timezone.now() - timedelta(days=30)
        MINIMUM_BILL = 1000  # ₦1,000

        expired_products = Product.objects.filter(
            lastclearance__lte=cutoff,
            delist=False,
            preferred_variant__price__gte=100000,
        ).values_list(
            "id",
            "chargeable_clicks",
            "preferred_variant__price",
        )

        products_to_delist = []

        for product_id, chargeable_clicks, product_price in expired_products:

            if not product_price:
                continue

            result = calculate_monthly_click_bill(
                eligible_clicks=int(chargeable_clicks or 0),
                product_price=int(product_price),
            )

            bill = result["bill"]

            if bill >= MINIMUM_BILL:
                products_to_delist.append(product_id)

        if products_to_delist:
            return Product.objects.filter(
                id__in=products_to_delist
            ).update(
                delist=True,
                cleared=False,
            )

        return 0


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    lookup_field = "id"

    queryset = (
        Product.objects
        .prefetch_related(
            "categories",
            "variants"
        )
    )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        chargeable_click = (
            request.query_params.get("chargeableClick", "false").lower() == "true"
        )

        if chargeable_click:
            Product.objects.filter(id=instance.id).update(
                chargeable_clicks=F("chargeable_clicks") + 1
            )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class ProductVariantDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductVariantSerializer
    queryset = ProductVariant.objects.select_related("product")
    lookup_field = "id"

class ProductUpdateView(generics.UpdateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user

        return (
            Product.objects
            .filter(owner=user)
            .prefetch_related("variants")
        )


class ProductDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Product.objects.filter(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()

        # High-risk product that has not been cleared
        if (
            product.preferred_variant
            and product.preferred_variant.price >= 100000
            and not product.cleared
        ):
            product.delist = True
            product.save(update_fields=["delist"])

            return Response(
                {
                    "detail": (
                        "Active high-risk products only get delisted and not deleted "
                        "until they have been paid for."
                    ),
                    "delisted": True,
                },
                status=status.HTTP_200_OK,
            )

        # Normal deletion for all other products
        self.perform_destroy(product)

        return Response(status=status.HTTP_204_NO_CONTENT)


class MakeProductStickyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        user = request.user

        product = get_object_or_404(
            Product,
            id=product_id,
            owner=user
        )

        if user.referral_points < 1:
            return Response(
                {"message": "Not enough referral points."},
                status=400
            )

        if product.is_sticky:
            return Response(
                {"message": "Product is already sticky."},
                status=400
            )

        product.is_sticky = True
        product.sticky_timestamp = timezone.now()

        user.referral_points -= 1

        user.save()
        product.save()

        return Response(
            {"message": "Product saved as sticky."},
            status=200
        )

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

        return (
            ProductVariant.objects
            .select_related("product")
            .prefetch_related(
                Prefetch(
                    "product__variants",
                    queryset=ProductVariant.objects.only("id")
                )
            )
            .filter(product__owner=user)
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        product = instance.product

        # Prevent deletion of the last variant
        if len(product.variants.all()) <= 1:
            return Response(
                {
                    "detail": (
                        "The last variant cannot be deleted. "
                        "Delete the product instead."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Protect uncleared high-risk variants
        if instance.price >= 100000 and not product.cleared:
            product.delist = True
            product.save(update_fields=["delist"])

            return Response(
                {
                    "detail": (
                        "Active high-risk products only get delisted "
                        "and not deleted until they have been paid for."
                    ),
                    "delisted": True,
                },
                status=status.HTTP_200_OK
            )

        # Normal deletion
        self.perform_destroy(instance)

        return Response(status=status.HTTP_204_NO_CONTENT)



class DelistToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        products_data = request.data.get("products")

        if not isinstance(products_data, list) or not products_data:
            return Response(
                {
                    "detail": (
                        "Provide a non-empty products array containing "
                        "product IDs and delist values."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate the request before processing any updates.
        for item in products_data:
            if (
                not isinstance(item, dict)
                or "id" not in item
                or not isinstance(item.get("delist"), bool)
            ):
                return Response(
                    {
                        "detail": (
                            "Each item must contain an id and a boolean "
                            "delist value."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        product_ids = [item["id"] for item in products_data]

        # Fetch only products belonging to the authenticated user.
        products = Product.objects.filter(
            owner=request.user,
            id__in=product_ids,
        ).in_bulk()

        cutoff = now() - timedelta(days=30)

        results = []
        updated_count = 0

        for item in products_data:
            product_id = item["id"]
            should_delist = item["delist"]

            product = products.get(product_id)

            if product is None:
                results.append({
                    "id": product_id,
                    "success": False,
                    "detail": "Product not found or you do not own it.",
                })
                continue

            # Delisting is always permitted.
            if should_delist:
                product.delist = True
                product.save(update_fields=["delist"])

                updated_count += 1
                results.append({
                    "id": product.id,
                    "success": True,
                    "delist": True,
                    "detail": "Product delisted successfully.",
                })
                continue

            # Cleared products can always be listed.
            if product.cleared:
                product.delist = False
                product.save(update_fields=["delist"])

                updated_count += 1
                results.append({
                    "id": product.id,
                    "success": True,
                    "delist": False,
                    "detail": "Product listed successfully.",
                })
                continue

            # Only uncleared products need the 30-day check.
            if product.created and product.created >= cutoff:
                product.delist = False
                product.save(update_fields=["delist"])

                updated_count += 1
                results.append({
                    "id": product.id,
                    "success": True,
                    "delist": False,
                    "detail": "Product listed successfully.",
                })
                continue

            # Uncleared products older than 30 days cannot be listed.
            results.append({
                "id": product.id,
                "success": False,
                "delist": product.delist,
                "detail": (
                    "This product cannot be listed because it has not been "
                    "cleared and is older than 30 days."
                ),
            })  

MINIMUM_BILL = 1000
HIGH_RISK_THRESHOLD = 100000

class InitializeClearancePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        optional_ids = request.data.get("optional_product_ids", [])

        if not isinstance(optional_ids, list):
            return Response(
                {"detail": "Invalid optional product selection."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            optional_ids = list(set(
                int(product_id)
                for product_id in optional_ids
            ))
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid product IDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cutoff = now() - timedelta(days=30)

        # 1. Fetch all compulsory products.
        compulsory_products = Product.objects.filter(
            owner=user,
            cleared=False,
            delist=True,
            lastclearance__lte=cutoff,
            preferred_variant__price__gte=HIGH_RISK_THRESHOLD,
        ).select_related("preferred_variant")

        selected_products = {}


        # 2. Calculate compulsory bills.
        for product in compulsory_products:
            billing = calculate_monthly_click_bill(
                eligible_clicks=product.chargeable_clicks,
                product_price=product.preferred_variant.price,
            )

            if billing["bill"] >= MINIMUM_BILL:
                selected_products[product.id] = (
                    product,
                    billing["bill"],
                )

        compulsory_ids = set(selected_products.keys())

        # 3. Fetch optional products.
        if optional_ids:
            optional_products = Product.objects.filter(
                owner=user,
                id__in=optional_ids,
                delist=False,
                preferred_variant__price__gte=HIGH_RISK_THRESHOLD,
            ).select_related("preferred_variant")

            # Ensure every submitted ID belongs to an eligible product.
            if optional_products.count() != len(set(optional_ids)):
                return Response(
                    {"detail": "One or more selected products are invalid."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            for product in optional_products:
                billing = calculate_monthly_click_bill(
                    eligible_clicks=product.chargeable_clicks,
                    product_price=product.preferred_variant.price,
                )

                if billing["bill"] > 0:
                    selected_products[product.id] = (
                        product,
                        billing["bill"],
                    )

        # Calculate total.
        # All products included in this payment
        candidate_ids = list(selected_products.keys())

        # First reconcile old pending transactions.
        reconcile_stale_pending_payments(candidate_ids)

        with transaction.atomic():

            # Lock products to prevent simultaneous payment reservations.
            locked_products = list(
                Product.objects
                .select_related("preferred_variant")
                .select_for_update(of=("self",))
                .filter(
                    id__in=candidate_ids,
                    owner=user,
                )
                .order_by("id")
            )

            locked_ids = {product.id for product in locked_products}

            # Ensure all optional selections are still valid.
            optional_ids_set = set(optional_ids)

            if not optional_ids_set.issubset(locked_ids):
                return Response(
                    {"detail": "One or more selected products are unavailable."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Recalculate using the latest locked product data.
            final_items = []

            for product in locked_products:

                if not product.preferred_variant:
                    continue

                price = product.preferred_variant.price

                billing = calculate_monthly_click_bill(
                    eligible_clicks=product.chargeable_clicks,
                    product_price=price,
                )

                bill = billing["bill"]

                if product.id in compulsory_ids:

                    # Revalidate compulsory clearance conditions.
                    is_still_due = (
                        not product.cleared
                        and product.delist
                        and product.lastclearance <= cutoff
                        and price >= HIGH_RISK_THRESHOLD
                        and bill >= MINIMUM_BILL
                    )

                    if is_still_due:
                        final_items.append((product, bill))

                elif product.id in optional_ids_set:

                    # Revalidate optional clearance conditions.
                    is_valid_optional = (
                        not product.delist
                        and price >= HIGH_RISK_THRESHOLD
                        and bill > 0
                    )

                    if not is_valid_optional:
                        return Response(
                            {
                                "detail": (
                                    f"{product.name} is no longer eligible "
                                    "for optional clearance."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    final_items.append((product, bill))

            if not final_items:
                return Response(
                    {"detail": "There are no eligible products to clear."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Calculate the final amount using locked product data.
            total_naira = sum(
                bill for _, bill in final_items
            )

            amount_kobo = total_naira * 100

            reference = f"JALE-CLR-{uuid.uuid4().hex[:20]}"

            # Create payment reservation.
            payment = ClearancePayment.objects.create(
                seller=user,
                reference=reference,
                amount=amount_kobo,
            )

            # Save the product snapshots.
            ClearancePaymentItem.objects.bulk_create([
                ClearancePaymentItem(
                    payment=payment,
                    product=product,
                    clicks_snapshot=product.chargeable_clicks,
                    amount=bill,
                )
                for product, bill in final_items
            ])



        # 7. Initialize Paystack.
        try:
            response = requests.post(
                "https://api.paystack.co/transaction/initialize",
                headers={
                    "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "email": user.email,
                    "amount": amount_kobo,
                    "currency": "NGN",
                    "reference": reference,
                    "callback_url": (
                        f"{settings.FRONTEND_URL}"
                        "/seller/clearance-payment/callback"
                    ),
                    "metadata": {
                        "payment_type": "product_clearance",
                        "payment_id": payment.id,
                    },
                },
                timeout=30,
            )

            data = response.json()

            if not response.ok or not data.get("status"):
                payment.status = "failed"
                payment.save(update_fields=["status"])

                return Response(
                    {"detail": "Unable to initialize Paystack payment."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            return Response({
                "authorization_url": data["data"]["authorization_url"],
                "reference": reference,
                "amount": total_naira,
            })

        except requests.RequestException:
            payment.status = "failed"
            payment.save(update_fields=["status"])

            return Response(
                {"detail": "Payment service is temporarily unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )  


class VerifyClearancePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        reference = request.data.get("reference")

        if not reference:
            return Response(
                {"detail": "Payment reference is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payment = ClearancePayment.objects.get(
                reference=reference,
                seller=request.user,
            )

        except ClearancePayment.DoesNotExist:
            return Response(
                {"detail": "Payment record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        result = verify_and_reconcile_payment(payment)

        payment_status = result["status"]

        if payment_status == "success":
            return Response({
                "detail": result["detail"],
                "success": True,
            })

        if payment_status == "processing":
            return Response(
                {
                    "detail": result["detail"],
                    "success": False,
                    "processing": True,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if payment_status == "unavailable":
            return Response(
                {
                    "detail": result["detail"],
                    "success": False,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if payment_status == "invalid":
            return Response(
                {
                    "detail": result["detail"],
                    "success": False,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            "detail": result["detail"],
            "success": False,
            "payment_status": payment_status,
        })


def verify_paystack_webhook_signature(raw_body, headers):
    """
    Validate Paystack webhook signatures.

    Supports:
    1. Current Paystack-Signature format.
    2. Legacy x-paystack-signature format.
    """

    # Current signing format.
    signature_header = headers.get("Paystack-Signature")

    if signature_header:

        secret = settings.PAYSTACK_WEBHOOK_SECRET

        if not secret:
            return False

        timestamp = None
        signatures = []

        for part in signature_header.split(","):

            if "=" not in part:
                continue

            key, value = part.split("=", 1)

            if key == "t":
                timestamp = value

            elif key == "v1":
                signatures.append(value)

        if not timestamp or not signatures:
            return False

        try:
            timestamp_int = int(timestamp)
        except ValueError:
            return False

        # Reject stale or future webhook timestamps.
        if abs(int(time.time()) - timestamp_int) > 300:
            return False

        signed_payload = (
            timestamp.encode() + b"." + raw_body
        )

        expected_signature = hmac.new(
            secret.encode(),
            signed_payload,
            hashlib.sha512,
        ).hexdigest()

        for signature in signatures:

            try:
                key_id, received_signature = signature.split(":", 1)
            except ValueError:
                continue

            if hmac.compare_digest(
                expected_signature,
                received_signature,
            ):
                return True

        return False

    # Legacy signing format.
    legacy_signature = headers.get("x-paystack-signature")

    if not legacy_signature:
        return False

    expected_signature = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode(),
        raw_body,
        hashlib.sha512,
    ).hexdigest()

    return hmac.compare_digest(
        expected_signature,
        legacy_signature,
    )


@method_decorator(csrf_exempt, name="dispatch")
class PaystackWebhookView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        raw_body = request.body

        # 1. Verify webhook authenticity.
        if not verify_paystack_webhook_signature(
            raw_body,
            request.headers,
        ):
            return Response(
                {"detail": "Invalid webhook signature."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # 2. Parse the event.
        try:
            event = json.loads(
                raw_body.decode("utf-8")
            )

        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response(
                {"detail": "Invalid webhook payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. We only handle successful charge events.
        if event.get("event") != "charge.success":
            return Response({"received": True})

        data = event.get("data", {})
        reference = data.get("reference")

        if not reference:
            return Response({"received": True})

        # 4. Find the corresponding JAle payment.
        try:
            payment = ClearancePayment.objects.get(
                reference=reference,
            )

        except ClearancePayment.DoesNotExist:
            # Could be another type of payment on your account.
            return Response({"received": True})

        # 5. Use the central reconciliation service.
        result = verify_and_reconcile_payment(payment)

        if result["status"] == "unavailable":

            # Ask Paystack to retry the webhook later.
            return Response(
                {
                    "received": True,
                    "detail": "Unable to verify transaction.",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Successful, already processed, pending or invalid
        # transactions are acknowledged.
        return Response({
            "received": True,
            "success": result["status"] == "success",
        })
