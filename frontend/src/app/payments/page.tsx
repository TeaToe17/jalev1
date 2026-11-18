"use client";

import { useEffect, useMemo, useState } from "react";
import { Product } from "@/types";
import api from "@/lib/api";
import {
  fetchProducts,
  getDecodedToken,
  calculateMonthlyClickBill,
} from "@/lib/utils";

const PAGE_SIZE = 10;

const CLEARANCE_DAYS = 30;
const MINIMUM_BILL = 1000;

const Page = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalMonthlyBill, setTotalMonthlyBill] = useState(0);

  const [selectedUpcoming, setSelectedUpcoming] = useState<
    Record<number, Product>
  >({});

  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Get authenticated seller
  useEffect(() => {
    const decoded = getDecodedToken();
    const id = decoded?.CustomUser?.id;

    if (!id) {
      setError("Please log in to access your billing page.");
      setLoading(false);
      return;
    }

    setUserId(id);
  }, []);

  // Fetch paginated high-value products
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchProducts(page, userId, "", null, true);

        if (cancelled) return;

        setProducts(response.results);
        setTotalMonthlyBill(Number(response.total_monthly_bill) || 0);

        setHasNext(Boolean(response.next));
        setHasPrevious(Boolean(response.previous));
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unable to load your billing information.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [userId, page]);

  const handlePayment = async () => {
    if (paying || totalPayable <= 0) return;

    setPaying(true);
    setPaymentError("");

    try {
      const optionalProductIds = Object.keys(selectedUpcoming).map(Number);

      const response = await api.post("product/clearance/payment/initialize/", {
        optional_product_ids: optionalProductIds,
      });

      const { authorization_url } = response.data;

      if (!authorization_url) {
        throw new Error("Unable to generate payment link.");
      }

      window.location.assign(authorization_url);
    } catch (err: any) {
      setPaymentError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to initialize payment.",
      );

      setPaying(false);
    }
  };

  // Calculate individual product bills and categorize products
  const processedProducts = useMemo(() => {
    const cutoff = Date.now() - CLEARANCE_DAYS * 24 * 60 * 60 * 1000;

    return products.map((product) => {
      const billing = calculateMonthlyClickBill(
        product.chargeable_clicks,
        product.price,
      );

      const clearanceExpired =
        new Date(product.lastclearance).getTime() <= cutoff;

      const isDue = clearanceExpired && billing.monthly_bill >= MINIMUM_BILL;

      return {
        ...product,
        billing,
        isDue,
      };
    });
  }, [products]);

  const dueProducts = processedProducts.filter((product) => product.isDue);

  const upcomingProducts = processedProducts.filter(
    (product) => !product.isDue,
  );

  // Optional upcoming product selection
  const toggleUpcoming = (product: Product) => {
    setSelectedUpcoming((previous) => {
      const updated = { ...previous };

      if (updated[product.id]) {
        delete updated[product.id];
      } else {
        updated[product.id] = product;
      }

      return updated;
    });
  };

  // Remove selections that are no longer eligible
  // This can also be handled during final payment validation.
  const optionalBill = Object.values(selectedUpcoming).reduce(
    (total, product) => {
      const bill = calculateMonthlyClickBill(
        product.chargeable_clicks,
        product.price,
      );

      return total + bill.monthly_bill;
    },
    0,
  );

  // Compulsory + optional products
  const totalPayable = totalMonthlyBill + optionalBill;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const ProductCard = ({
    product,
    due = false,
  }: {
    product: (typeof processedProducts)[number];
    due?: boolean;
  }) => {
    const selected = Boolean(selectedUpcoming[product.id]);

    return (
      <div
        key={product.id}
        className={`rounded-xl border p-4 ${
          due
            ? "border-orange-300 bg-orange-50/40"
            : selected
              ? "border-green-500 bg-green-50/40"
              : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex gap-4">
          {product.image && (
            <img
              src={product.image}
              alt={product.name}
              className="h-20 w-20 rounded-lg object-cover"
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{product.name}</h3>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  due
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {due ? "Due for clearance" : "Upcoming"}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Product price: {formatCurrency(Number(product.price))}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Last cleared: {formatDate(product.lastclearance)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Chargeable clicks</p>
            <p className="font-semibold">
              {product.chargeable_clicks.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Cost per click</p>
            <p className="font-semibold">
              {formatCurrency(product.billing.cost_per_click)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Accrued bill</p>
            <p className="font-bold">
              {formatCurrency(product.billing.monthly_bill)}
            </p>
          </div>
        </div>

        {!due && (
          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <span className="text-sm text-gray-600">Optional clearance</span>

            <button
              type="button"
              onClick={() => toggleUpcoming(product)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                selected
                  ? "bg-gray-200 text-gray-700"
                  : "bg-green-600 text-white"
              }`}
            >
              {selected ? "Remove selection" : "Select for payment"}
            </button>
          </div>
        )}

        {due && (
          <p className="mt-3 text-sm font-medium text-orange-700">
            This product is included in your compulsory clearance bill.
          </p>
        )}
      </div>
    );
  };

  if (loading && products.length === 0) {
    return (
      <div className="p-8 text-center">Loading your billing information...</div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Billing summary */}
      <section className="rounded-2xl bg-gray-900 p-6 text-white">
        <p className="text-sm text-gray-300">Total compulsory monthly bill</p>

        <h1 className="mt-2 text-3xl font-bold">
          {formatCurrency(totalMonthlyBill)}
        </h1>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
          <div>
            <p className="text-xs text-gray-400">Optional selections</p>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(optionalBill)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">Total payable</p>
            <p className="mt-1 text-lg font-semibold text-green-400">
              {formatCurrency(totalPayable)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Your compulsory bill includes all products that have met the 30-day
          clearance period and minimum ₦1,000 billing requirement.
        </p>
      </section>

      {paymentError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {paymentError}
        </p>
      )}

      <button
        type="button"
        onClick={handlePayment}
        disabled={paying || totalPayable <= 0}
        className="w-full rounded-xl bg-green-600 px-6 py-4 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {paying
          ? "Redirecting to Paystack..."
          : `Pay ${formatCurrency(totalPayable)}`}
      </button>

      {/* Compulsory products */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Products due for clearance</h2>

          <p className="text-sm text-gray-500">
            These products have met the clearance requirements and are
            automatically included in your bill.
          </p>
        </div>

        {dueProducts.length > 0 ? (
          dueProducts.map((product) => (
            <ProductCard key={product.id} product={product} due />
          ))
        ) : (
          <div className="rounded-xl border border-gray-200 p-6 text-center text-gray-500">
            No products currently require compulsory clearance.
          </div>
        )}
      </section>

      {/* Upcoming products */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Upcoming clearance</h2>

          <p className="text-sm text-gray-500">
            These products have accrued advertising charges but haven't met all
            compulsory clearance requirements. You can optionally clear them
            now.
          </p>
        </div>

        {upcomingProducts.length > 0 ? (
          upcomingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="rounded-xl border border-gray-200 p-6 text-center text-gray-500">
            No upcoming products on this page.
          </div>
        )}
      </section>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t pt-5">
        <button
          type="button"
          disabled={!hasPrevious || loading}
          onClick={() => setPage((previous) => previous - 1)}
          className="rounded-lg border px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm text-gray-500">Page {page}</span>

        <button
          type="button"
          disabled={!hasNext || loading}
          onClick={() => setPage((previous) => previous + 1)}
          className="rounded-lg border px-4 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </main>
  );
};

export default Page;
