
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";

const CallbackPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("Verifying your payment...");

  // Paystack may provide either parameter.
  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref");

  const verifyPayment = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!reference) {
        setMessage("No payment reference was provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setPending(false);
      setMessage("Verifying your payment...");

      try {
        const response = await api.post(
          "product/clearance/payment/verify/",
          { reference },
        );

        if (isCancelled()) return;

        const data = response.data;

        if (data.success) {
          setSuccess(true);
          setPending(false);
          setMessage("Your clearance payment was successful.");
        } else if (
          data.processing ||
          data.payment_status === "pending" ||
          data.payment_status === "processing"
        ) {
          setSuccess(false);
          setPending(true);
          setMessage(
            "Your payment is still being verified. Please check again shortly.",
          );
        } else if (data.payment_status === "failed") {
          setSuccess(false);
          setPending(false);
          setMessage(
            "Paystack reports that this payment was not successful.",
          );
        } else {
          setSuccess(false);
          setPending(true);
          setMessage(
            "We have not been able to confirm your payment yet. You can check again.",
          );
        }
      } catch (error: any) {
        if (isCancelled()) return;

        const statusCode = error?.response?.status;

        if (statusCode === 503 || !error?.response) {
          // Verification service unavailable does not mean payment failed.
          setSuccess(false);
          setPending(true);
          setMessage(
            "We could not reach the payment verification service. Your payment may still be processing. Please check again.",
          );
        } else {
          setSuccess(false);
          setPending(false);
          setMessage(
            error?.response?.data?.detail ||
              "We could not verify this payment.",
          );
        }
      } finally {
        if (!isCancelled()) {
          setLoading(false);
        }
      }
    },
    [reference],
  );

  useEffect(() => {
    let cancelled = false;

    verifyPayment(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [verifyPayment]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border p-8 text-center">
        {loading ? (
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
        ) : (
          <div
            className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
              success
                ? "bg-green-100 text-green-600"
                : pending
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-600"
            }`}
          >
            {success ? "✓" : pending ? "…" : "!"}
          </div>
        )}

        <h1 className="text-xl font-bold">
          {loading
            ? "Verifying Payment"
            : success
              ? "Payment Successful"
              : pending
                ? "Payment Pending"
                : "Payment Verification"}
        </h1>

        <p className="mt-3 text-sm text-gray-500">{message}</p>

        {!loading && (
          <div className="mt-6 space-y-3">
            {pending && (
              <button
                onClick={() => verifyPayment()}
                className="w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white"
              >
                Check payment again
              </button>
            )}

            <button
              onClick={() =>
                router.replace("/payments")
              }
              className="w-full rounded-lg border px-5 py-3 font-semibold"
            >
              Return to Clearance
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default CallbackPage;
