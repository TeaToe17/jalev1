
import requests
import traceback

from contextlib import contextmanager

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from .models import ClearancePayment, ClearancePaymentItem, Product


# --------------------------------------------------
# DEBUG HELPER
# --------------------------------------------------

def debug(message, *args):
    timestamp = timezone.now().strftime("%Y-%m-%d %H:%M:%S")

    if args:
        message = message % args

    print(f"\n[CLEARANCE DEBUG {timestamp}] {message}", flush=True)


# --------------------------------------------------
# 1. VERIFY PAYMENT DIRECTLY WITH PAYSTACK
# --------------------------------------------------

def verify_paystack_reference(reference):

    debug("Starting Paystack verification for reference: %s", reference)

    try:
        url = f"https://api.paystack.co/transaction/verify/{reference}"

        debug("Paystack URL: %s", url)
        debug("Sending verification request...")

        response = requests.get(
            url,
            headers={
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            },
            timeout=30,
        )

        debug("Paystack HTTP status: %s", response.status_code)
        debug("Paystack raw response: %s", response.text)

        result = response.json()

        debug("Paystack response parsed: %s", result)

        if response.ok and result.get("status"):

            data = result.get("data")

            debug(
                "Verification successful. Transaction status: %s",
                data.get("status") if data else None,
            )

            return data

        debug(
            "Paystack verification unsuccessful. HTTP: %s, API status: %s, message: %s",
            response.status_code,
            result.get("status"),
            result.get("message"),
        )

    except requests.RequestException as error:
        debug("NETWORK ERROR during Paystack verification: %s", str(error))
        traceback.print_exc()

    except ValueError as error:
        debug("INVALID JSON returned by Paystack: %s", str(error))
        traceback.print_exc()

    except Exception as error:
        debug("UNEXPECTED VERIFICATION ERROR: %s", str(error))
        traceback.print_exc()

    debug("Returning None: Paystack verification could not be completed.")

    return None


# --------------------------------------------------
# 2. PREVENT SIMULTANEOUS VERIFICATION
# --------------------------------------------------

@contextmanager
def payment_verification_lock(payment_id):

    debug("Attempting advisory lock for payment ID: %s", payment_id)

    if connection.vendor != "postgresql":
        debug("ERROR: Current database is %s", connection.vendor)

        raise RuntimeError(
            "Payment verification locking requires PostgreSQL."
        )

    lock_acquired = False

    try:
        with connection.cursor() as cursor:

            debug("Executing pg_try_advisory_lock...")

            cursor.execute(
                "SELECT pg_try_advisory_lock(17483, %s)",
                [payment_id],
            )

            lock_acquired = cursor.fetchone()[0]

        debug(
            "Advisory lock result for payment %s: %s",
            payment_id,
            lock_acquired,
        )

        yield lock_acquired

    except Exception as error:
        debug(
            "ERROR while acquiring payment lock %s: %s",
            payment_id,
            str(error),
        )
        traceback.print_exc()
        raise

    finally:

        if lock_acquired:

            debug("Releasing advisory lock for payment: %s", payment_id)

            try:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT pg_advisory_unlock(17483, %s)",
                        [payment_id],
                    )

                    unlocked = cursor.fetchone()[0]

                debug(
                    "Advisory lock released for payment %s: %s",
                    payment_id,
                    unlocked,
                )

            except Exception as error:
                debug(
                    "ERROR releasing advisory lock %s: %s",
                    payment_id,
                    str(error),
                )
                traceback.print_exc()
                raise


# --------------------------------------------------
# 3. FULFIL PAYMENT
# --------------------------------------------------

def fulfill_clearance_payment(payment, data):

    debug(
        "Starting payment fulfilment. Payment ID: %s | Reference: %s",
        payment.id,
        payment.reference,
    )

    debug("Received transaction data: %s", data)

    # Validate Paystack transaction data first.

    if data.get("status") != "success":
        debug("VALIDATION FAILED: Transaction status is not success.")
        raise ValueError("Paystack has not confirmed payment.")

    if data.get("reference") != payment.reference:
        debug(
            "VALIDATION FAILED: Reference mismatch. Local: %s | Paystack: %s",
            payment.reference,
            data.get("reference"),
        )
        raise ValueError("Payment reference mismatch.")

    try:
        paid_amount = int(data.get("amount", 0))

    except (TypeError, ValueError):
        debug("VALIDATION FAILED: Invalid payment amount.")
        raise ValueError("Invalid payment amount.")

    debug(
        "Amount comparison. Paystack: %s | Local: %s",
        paid_amount,
        payment.amount,
    )

    if paid_amount < payment.amount:
        debug("VALIDATION FAILED: Amount insufficient.")
        raise ValueError("Payment amount insufficient.")

    if data.get("currency") != "NGN":
        debug(
            "VALIDATION FAILED: Invalid currency: %s",
            data.get("currency"),
        )
        raise ValueError("Invalid payment currency.")

    debug("All Paystack transaction validations passed.")

    with transaction.atomic():

        debug("Database transaction started.")

        locked_payment = (
            ClearancePayment.objects
            .select_for_update()
            .get(id=payment.id)
        )

        debug(
            "Locked payment. ID: %s | Current status: %s",
            locked_payment.id,
            locked_payment.status,
        )

        if locked_payment.status == "success":
            debug("Payment already fulfilled. Skipping.")
            return False

        if locked_payment.status != "pending":
            debug(
                "Payment cannot be fulfilled. Current status: %s",
                locked_payment.status,
            )
            raise ValueError(
                "This payment is no longer pending."
            )

        items = list(
            ClearancePaymentItem.objects
            .filter(payment=locked_payment)
            .order_by("product_id")
        )

        debug("Payment contains %s clearance items.", len(items))

        product_ids = [item.product_id for item in items]

        debug("Product IDs associated with payment: %s", product_ids)

        products = {
            product.id: product
            for product in Product.objects
            .select_for_update()
            .filter(id__in=product_ids)
            .order_by("id")
        }

        debug("Successfully locked %s products.", len(products))

        for item in items:

            debug(
                "Processing item ID: %s | Product ID: %s | Click snapshot: %s",
                item.id,
                item.product_id,
                item.clicks_snapshot,
            )

            product = products.get(item.product_id)

            if not product:
                debug(
                    "ERROR: Product %s does not exist.",
                    item.product_id,
                )

                raise ValueError(
                    f"Product {item.product_id} no longer exists."
                )

            debug(
                "Product before update. ID: %s | Clicks: %s | "
                "Cleared: %s | Delisted: %s | Last clearance: %s",
                product.id,
                product.chargeable_clicks,
                product.cleared,
                product.delist,
                product.lastclearance,
            )

            # Determine whether this payment's snapshot is still valid.
            snapshot_is_current = (
                product.lastclearance is None
                or locked_payment.created > product.lastclearance
            )

            if not snapshot_is_current:

                debug(
                    "STALE PAYMENT SNAPSHOT: Payment %s was created at %s, "
                    "but product %s was already cleared at %s. "
                    "Skipping product updates to protect newer clicks.",
                    locked_payment.reference,
                    locked_payment.created,
                    product.id,
                    product.lastclearance,
                )

                continue

            previous_clicks = product.chargeable_clicks

            product.chargeable_clicks = max(
                0,
                product.chargeable_clicks - item.clicks_snapshot,
            )

            product.cleared = True
            product.delist = False
            product.lastclearance = timezone.now()

            debug(
                "Product after calculations. ID: %s | Previous clicks: %s | "
                "Snapshot: %s | Remaining clicks: %s",
                product.id,
                previous_clicks,
                item.clicks_snapshot,
                product.chargeable_clicks,
            )

            product.save(update_fields=[
                "chargeable_clicks",
                "cleared",
                "delist",
                "lastclearance",
            ])

            debug(
                "Product %s successfully updated.",
                product.id,
            )

        locked_payment.status = "success"
        locked_payment.paid_at = timezone.now()

        locked_payment.save(update_fields=[
            "status",
            "paid_at",
        ])

        debug(
            "Payment %s marked SUCCESS inside transaction.",
            locked_payment.reference,
        )

    debug(
        "DATABASE TRANSACTION COMMITTED. Payment %s fulfilled successfully.",
        payment.reference,
    )

    return True


# --------------------------------------------------
# 4. RECONCILE A PAYMENT USING VERIFIED DATA
# --------------------------------------------------

def reconcile_payment(payment, data):

    debug(
        "Reconciling payment ID: %s | Reference: %s",
        payment.id,
        payment.reference,
    )

    return fulfill_clearance_payment(payment, data)


# --------------------------------------------------
# 5. CENTRAL VERIFICATION + RECONCILIATION
# --------------------------------------------------

def verify_and_reconcile_payment(payment):

    debug(
        "========== STARTING PAYMENT RECONCILIATION =========="
    )

    debug(
        "Payment ID: %s | Reference: %s | Initial status: %s",
        payment.id,
        payment.reference,
        payment.status,
    )

    with payment_verification_lock(payment.id) as acquired:

        if not acquired:

            debug(
                "Payment %s is already being processed by another request.",
                payment.reference,
            )

            return {
                "status": "processing",
                "detail": "Payment verification is already in progress.",
            }

        debug("Lock acquired. Refreshing payment from database.")

        payment = ClearancePayment.objects.get(id=payment.id)

        debug(
            "Fresh payment status: %s",
            payment.status,
        )

        if payment.status == "success":

            debug("Payment already successful. Nothing to do.")

            return {
                "status": "success",
                "detail": "Payment already verified.",
            }

        if payment.status != "pending":

            debug(
                "Payment is no longer pending. Status: %s",
                payment.status,
            )

            return {
                "status": payment.status,
                "detail": "Payment is no longer pending.",
            }

        debug("Calling Paystack verification for %s", payment.reference)

        data = verify_paystack_reference(payment.reference)

        if data is None:

            debug(
                "Paystack verification returned None for %s.",
                payment.reference,
            )

            return {
                "status": "unavailable",
                "detail": "Unable to verify payment with Paystack.",
            }

        paystack_status = data.get("status")

        debug(
            "Paystack transaction status: %s",
            paystack_status,
        )

        if paystack_status == "success":

            debug("Paystack confirms SUCCESS. Starting fulfilment.")

            try:

                fulfilled = reconcile_payment(payment, data)

                debug(
                    "Reconciliation completed. Fulfilled: %s",
                    fulfilled,
                )

                return {
                    "status": "success",
                    "fulfilled": fulfilled,
                    "detail": "Payment successfully reconciled.",
                }

            except ValueError as error:

                debug(
                    "PAYMENT VALIDATION / FULFILMENT ERROR: %s",
                    str(error),
                )

                traceback.print_exc()

                return {
                    "status": "invalid",
                    "detail": str(error),
                }

            except Exception as error:

                debug(
                    "UNEXPECTED FULFILMENT ERROR: %s",
                    str(error),
                )

                traceback.print_exc()
                raise

        if paystack_status in [
            "failed",
            "abandoned",
            "reversed",
        ]:

            debug(
                "Paystack reports definitive failure: %s",
                paystack_status,
            )

            with transaction.atomic():

                locked_payment = (
                    ClearancePayment.objects
                    .select_for_update()
                    .get(id=payment.id)
                )

                if locked_payment.status == "pending":

                    locked_payment.status = "failed"

                    locked_payment.save(
                        update_fields=["status"]
                    )

                    debug("Local payment status updated to FAILED.")

                else:

                    debug(
                        "Local payment status changed before failure update: %s",
                        locked_payment.status,
                    )

            return {
                "status": "failed",
                "detail": "Paystack reports that payment failed.",
            }

        debug(
            "Transaction is not final yet. Paystack status: %s",
            paystack_status,
        )

        return {
            "status": "pending",
            "detail": "Paystack has not confirmed payment yet.",
        }


# --------------------------------------------------
# 6. RECONCILE A SMALL BATCH OF PENDING PAYMENTS
# --------------------------------------------------

def reconcile_stale_pending_payments(
    product_ids=None,
    batch_size=5,
):

    debug("========== STARTING BATCH RECONCILIATION ==========")

    debug(
        "Product filter: %s | Batch size: %s",
        product_ids,
        batch_size,
    )

    payments = ClearancePayment.objects.filter(
        status="pending"
    )

    if product_ids is not None:

        if not product_ids:

            debug("Empty product ID list. Nothing to reconcile.")

            return []

        payments = payments.filter(
            items__product_id__in=product_ids
        ).distinct()

    payments = payments.order_by(
        "created",
        "id",
    )[:batch_size]

    debug("Pending payments selected: %s", payments.count())

    results = []

    for payment in payments:

        debug(
            "Processing batch payment. ID: %s | Reference: %s",
            payment.id,
            payment.reference,
        )

        try:

            result = verify_and_reconcile_payment(payment)

            debug(
                "Batch result for %s: %s",
                payment.reference,
                result,
            )

            results.append({
                "reference": payment.reference,
                **result,
            })

        except Exception as error:

            debug(
                "BATCH ERROR for payment %s: %s",
                payment.reference,
                str(error),
            )

            traceback.print_exc()

    debug(
        "========== BATCH RECONCILIATION COMPLETE. Results: %s ==========",
        len(results),
    )

    return results
