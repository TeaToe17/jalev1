"use client";

import Head from "next/head";
import api from "@/lib/api";
import { useAppContext } from "@/context";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchUser, fetchProductDetail } from "@/lib/utils";
import { Home, ArrowLeft, X, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface ProductVariant {
  id: number;
  sku: string;
  price: string | number;
  stock: number;
  sizes: string[];
  attributes: Record<string, string | number | null>;
  negotiable: boolean;
  used: boolean;
  sold: boolean;
  reserved: boolean;
  image: string;
  created: string;
}

interface ProductDetailData {
  id: number;
  name: string;
  categories: Category[];
  created: string;
  owner: number;
  owner_whatsapp?: string;
  is_sticky: boolean;
  sticky_timestamp: string | null;
  variants: ProductVariant[];
  preferred_variant_id: number;
}

interface CustomUser {
  id: number;
  username: string;
  whatsapp: string;
  call: string;
}

interface Message {
  type: "success" | "error";
  text: string;
}

const ProductClientComponent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { id } = useParams();

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [selectedSize, setSelectedSize] = useState<string>("");

  const {
    setUrl,
    setCurrentProduct,
    setChangedCart,
    cart,
    setCart,
    currentUser,
  } = useAppContext();

  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const [message, setMessage] = useState<Message | null>(null);

  // FIXED: variant-specific cart tracking
  const [showTransactionNotice, setShowTransactionNotice] = useState(true);
  const [cartClickedVariants, setCartClickedVariants] = useState<number[]>([]);
  const normalizeSizes = (sizes: string[] | null | undefined): string[] => {
    if (!sizes?.length) return [];

    // Handle sizes arriving as a JSON string inside an array
    if (sizes.length === 1 && typeof sizes[0] === "string") {
      try {
        const parsed = JSON.parse(sizes[0]);

        if (Array.isArray(parsed)) {
          return parsed.map(String);
        }
      } catch {
        // The value is already a normal size, such as ["S"]
      }
    }

    return sizes;
  };

  useEffect(() => {
    setChangedCart(true);
  }, []);

  useEffect(() => {
    if (id) {
      const loadProductConfigDetails = async () => {
        setIsLoading(true);

        try {
          const data = await fetchProductDetail(Number(id), true);

          if (data) {
            const normalizedData = {
              ...data,
              variants: data.variants.map((variant) => ({
                ...variant,
                sizes: normalizeSizes(variant.sizes),
              })),
            };

            setProduct(normalizedData);
            const defaultVariant = normalizedData.variants.find(
              (v) => v.id === normalizedData.preferred_variant_id,
            );

            const initialVariant =
              defaultVariant || normalizedData.variants[0] || null;

            setSelectedVariant(initialVariant);
            setSelectedSize("");
          } else {
            setError("Product configuration not found.");
          }
        } catch (err: any) {
          console.error("Error fetching product details:", err);

          setError(err.message || "Failed to retrieve configuration details.");
        } finally {
          setIsLoading(false);
        }
      };

      loadProductConfigDetails();
    }
  }, [id]);

  const AddtoCart = async (variant: ProductVariant) => {
    if (!product || !variant) return;

    if (variant.sizes?.length > 0 && !selectedSize) {
      setMessage({
        type: "error",
        text: "Please select a size before adding to cart.",
      });
      return;
    }
    // FIXED: variant-specific cart state
    setCartClickedVariants((prev) => [...prev, variant.id]);

    const numericPrice =
      typeof variant.price === "string"
        ? parseFloat(variant.price)
        : variant.price;

    setCart((prev) => [
      ...prev,
      {
        owner: product.owner,
        variant: variant.id,
        quantity: 1,
        size: selectedSize,
        product_image: variant.image,
        product_stock: variant.stock,
        product_name: `${product.name} (${variant.sku})`,
        product_price: numericPrice,
      },
    ]);

    try {
      const user: CustomUser | null = await fetchUser();

      if (!user || !user.id) {
        setMessage({
          type: "error",
          text: "Invalid user information. Please log in again.",
        });

        setUrl(pathname);
        router.push("/login");

        return;
      }

      await api.post("order/create/cartitem/", {
        variant: variant.id,
        quantity: 1,
        size: selectedSize,
      });

      setChangedCart(true);

      setMessage({
        type: "success",
        text: "Variant added to cart successfully!",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const HandleNegotiation = (receiverId: number) => {
    if (!product || !selectedVariant) return;

    const variantPrice = Number(selectedVariant.price);

    // High-value products: negotiate directly on WhatsApp
    if (product.owner_whatsapp && variantPrice > 100000) {
      const message = `Hello, I saw your product "${product.name}" on JALE and I'm interested in negotiating the price.

        Selected ${
          Object.entries(selectedVariant.attributes || {})
            .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
            .join(", ") || "Default variation"
        }
        Current Price: ₦${variantPrice.toLocaleString("en-NG")}

        I would like to discuss the price. Thank you.`;

      const whatsappNumber = product.owner_whatsapp.replace(/\D/g, "");

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");

      return;
    }

    // Normal products: use JAle's internal chat
    if (receiverId) {
      setCurrentProduct(product);
      router.push(`/chat/${receiverId}`);
    }
  };

  if (!id) {
    return <p className="p-4 text-center text-sm">Loading ID...</p>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1c2b3a]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] p-8 text-red-500 text-center font-medium text-sm">
        {error}
      </div>
    );
  }

  if (!product || !selectedVariant) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] p-8 text-center text-sm">
        <p className="text-gray-600">Product configurations not found.</p>

        <Link
          href="/"
          className="text-blue-500 hover:underline mt-4 inline-block"
        >
          Return to home
        </Link>
      </div>
    );
  }

  const activePrice =
    typeof selectedVariant.price === "string"
      ? parseFloat(selectedVariant.price)
      : selectedVariant.price;

  const isProductOwner = product.owner === Number(currentUser?.id);
  const isHighValueProduct = activePrice >= 100000;

  const usesWhatsAppNegotiation =
    isHighValueProduct && !!product.owner_whatsapp;

  return (
    <>
      <Head>
        <title>{product.name}</title>

        <meta property="og:title" content={product.name} />

        <meta property="og:image" content={selectedVariant.image} />
      </Head>

      <main className="min-h-screen bg-[#f8f9fa] px-4 sm:px-8 md:px-16 lg:px-32 py-10">
        {/* NAVIGATION */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] p-2 rounded-full text-white shadow-md"
              >
                <Home size={20} />
              </motion.div>
            </Link>

            <button
              onClick={() => router.back()}
              className="flex items-center text-[#1c2b3a] hover:underline text-sm font-medium"
            >
              <ArrowLeft size={16} className="mr-1" />

              <span>Back</span>
            </button>
          </div>
        </div>

        {/* ALERTS */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-4 left-4 right-4 p-3 rounded-md shadow-md flex items-start gap-2 z-30 ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              )}

              <p className="flex-1 text-sm">{message.text}</p>

              <button
                onClick={() => setMessage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* IMAGE GALLERY */}
            <div className="lg:w-1/2 p-4">
              <div className="grid grid-cols-[2fr_1fr] gap-2 h-[400px] md:h-[500px]">
                {/* MAIN IMAGE */}
                <div className="relative rounded-lg overflow-hidden bg-gray-50">
                  <Image
                    src={selectedVariant.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 66vw, 33vw"
                    className="object-cover"
                  />
                </div>

                {/* SCROLLABLE VARIANT IMAGES */}
                <div className="flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
                  {product.variants.map((v, index) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariant(v);
                        setSelectedSize("");
                      }}
                      className={`relative min-h-[120px] rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                        selectedVariant.id === v.id
                          ? "border-[#1c2b3a]"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={v.image || "/placeholder.svg"}
                        alt={`Variant snapshot ${index}`}
                        fill
                        sizes="(max-width: 768px) 33vw, 16vw"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DETAILS */}
            <div className="lg:w-1/2 p-6 lg:p-8 lg:py-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* BADGES */}
                <div className="flex flex-wrap gap-2">
                  {selectedVariant.negotiable && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                      Negotiable
                    </span>
                  )}

                  {selectedVariant.used && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      Used
                    </span>
                  )}

                  {!selectedVariant.sold && selectedVariant.stock > 0 ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                      In Stock ({selectedVariant.stock})
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                      Sold Out
                    </span>
                  )}

                  {selectedVariant.reserved && (
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                      Reserved
                    </span>
                  )}
                </div>

                {/* TITLE */}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#1c2b3a]">
                    {product.name}
                  </h1>

                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    SKU: {selectedVariant.sku}
                  </p>
                </div>

                {/* PRICE */}
                <p className="text-[#EF4444] text-2xl font-bold">
                  ₦{activePrice.toLocaleString()}
                </p>

                {/* VARIANT SELECTOR */}
                <div className="border-t border-b border-gray-100 py-3 my-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-2">
                    Select Options Variation:
                  </h3>

                  <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                    {product.variants.map((v) => {
                      const label =
                        Object.entries(v.attributes || {})
                          .map(([k, val]) => `${k.replace(/_/g, " ")}: ${val}`)
                          .join(" | ") || `Option Choice #${v.id}`;

                      return (
                        <button
                          key={`variant-selector-${v.id}`}
                          onClick={() => {
                            setSelectedVariant(v);
                            setSelectedSize("");
                          }}
                          className={`text-xs px-3 py-2 rounded-lg border transition-all font-medium ${
                            selectedVariant.id === v.id
                              ? "bg-[#1c2b3a] text-white border-[#1c2b3a] shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SIZE SELECTOR */}
                {selectedVariant.sizes?.length > 0 && (
                  <div className="border-b border-gray-100 py-4">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3">
                      Select Size:
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {selectedVariant.sizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-12 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            selectedSize === size
                              ? "bg-[#1c2b3a] text-white border-[#1c2b3a]"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>

                    {!selectedSize && (
                      <p className="text-xs text-red-500 mt-2">
                        Please select a size before adding to cart.
                      </p>
                    )}
                  </div>
                )}

                {/* SPECIFICATIONS */}
                <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px] sm:text-xs">
                        <th className="p-3 pl-4">Specification Property</th>

                        <th className="p-3 pr-4">Details Value Mapping</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 text-gray-600">
                      {Object.entries(selectedVariant?.attributes || {}).map(
                        ([key, val]) => {
                          const readableLabel = key
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase());

                          return (
                            <tr
                              key={`${selectedVariant.id}-${key}`}
                              className="hover:bg-gray-50/30 transition-colors"
                            >
                              <td className="p-3 pl-4 font-medium text-gray-900">
                                {readableLabel}
                              </td>

                              <td className="p-3 pr-4 font-mono font-medium text-indigo-600">
                                {String(val)}
                              </td>
                            </tr>
                          );
                        },
                      )}

                      {Object.keys(selectedVariant?.attributes || {}).length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="p-6 text-center text-gray-400 italic bg-gray-50/10"
                          >
                            No custom specifications provided for this
                            configuration.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* CATEGORIES */}
                <div className="pt-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Categories
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {product.categories
                      .map((cat, index) => (
                        <span
                          key={`${cat.id}-${index}`}
                          className="bg-[#1c2b3a]/10 text-[#1c2b3a] px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {cat.name}
                        </span>
                      ))
                      .filter(Boolean)}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-6 space-y-4">
                {/* HIGH-VALUE PRODUCT WARNING */}
                {!isProductOwner &&
                  usesWhatsAppNegotiation &&
                  showTransactionNotice && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle
                          size={18}
                          className="text-amber-600 flex-shrink-0 mt-0.5"
                        />

                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-amber-800 mb-1">
                            Important: Shop Safely
                          </h4>

                          <p className="text-xs text-amber-800 leading-relaxed">
                            If you will be contacting the seller directly on
                            WhatsApp, please exercise caution when making
                            payments. Where possible, arrange to meet the seller
                            and inspect the product before making payment.
                          </p>

                          <p className="text-xs text-amber-800 leading-relaxed mt-2">
                            JAle does not facilitate or guarantee transactions
                            made outside the platform and is not responsible for
                            scams, fraudulent transfers, or disputes arising
                            from them. Agree on a safe payment and delivery
                            arrangement with the seller before proceeding.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowTransactionNotice(false)}
                          aria-label="Dismiss safety notice"
                          className="text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-full p-1 transition flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                {/* REGULAR PRODUCT NOTICE */}
                {!isProductOwner &&
                  !isHighValueProduct &&
                  showTransactionNotice && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle
                          size={18}
                          className="text-green-600 flex-shrink-0 mt-0.5"
                        />

                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-green-800 mb-1">
                            Shop with Confidence
                          </h4>

                          <p className="text-xs text-green-800 leading-relaxed">
                            Keep your negotiations within JALE. Regular products
                            follow our payment-on-delivery arrangement, so you
                            can inspect your purchase before making payment.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowTransactionNotice(false)}
                          aria-label="Dismiss shopping notice"
                          className="text-green-600 hover:text-green-900 hover:bg-green-100 rounded-full p-1 transition flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                {selectedVariant.stock < 1 ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                    This variation selection option is currently out of stock.
                  </div>
                ) : isProductOwner ? (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm font-medium">
                    You are the product owner. You cannot purchase your own
                    items.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* ADD TO CART / GO TO CART */}
                    {cart.some((item) => item.variant === selectedVariant.id) ||
                    cartClickedVariants.includes(selectedVariant.id) ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push("/cart")}
                        className="flex-1 bg-gradient-to-r from-[#1c2b3a] to-[#1c2b3a] text-white px-6 py-3 rounded-lg shadow font-medium text-sm"
                      >
                        Go to cart
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={
                          !!selectedVariant.sizes?.length && !selectedSize
                        }
                        onClick={() => AddtoCart(selectedVariant)}
                        className=" disabled:opacity-50 flex-1 bg-gradient-to-r from-[#1c2b3a] to-[#1c2b3a] text-white px-6 py-3 rounded-lg shadow font-medium text-sm"
                      >
                        Add to cart
                      </motion.button>
                    )}

                    {/* NEGOTIATE */}
                    {selectedVariant.negotiable ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => HandleNegotiation(product.owner)}
                        className="flex-1 bg-gradient-to-r from-[#fcecd8] to-[#fcecd8] text-[#1c2b3a] px-6 py-3 rounded-lg shadow border border-[#1c2b3a]/20 font-medium text-sm"
                      >
                        Negotiate Price
                      </motion.button>
                    ) : usesWhatsAppNegotiation &&
                      selectedVariant.negotiable ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => HandleNegotiation(product.owner)}
                        className="flex-1 bg-gradient-to-r from-[#fcecd8] to-[#fcecd8] text-[#1c2b3a] px-6 py-3 rounded-lg shadow border border-[#1c2b3a]/20 font-medium text-sm"
                      >
                        Negotiate Price
                      </motion.button>
                    ) : (
                      usesWhatsAppNegotiation &&
                      !selectedVariant.negotiable && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => HandleNegotiation(product.owner)}
                          className="flex-1 bg-gradient-to-r from-[#fcecd8] to-[#fcecd8] text-[#1c2b3a] px-6 py-3 rounded-lg shadow border border-[#1c2b3a]/20 font-medium text-sm"
                        >
                          Contact Seller
                        </motion.button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ProductClientComponent;
