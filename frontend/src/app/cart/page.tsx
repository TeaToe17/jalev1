"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Package,
  CreditCard,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useAppContext } from "@/context";
import api from "@/lib/api";
import { fetchUser } from "@/lib/utils";

interface CustomUser {
  id: number;
  username: string;
  whatsapp: string;
  call: string;
  image: string;
  email: string;
  referral_points: number;
  categories: number[];
}

const Cart = () => {
  const { cart, setChangedCart, setUrl } = useAppContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true);
    setChangedCart(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, [setChangedCart]);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(""), 3000);
  };

  const RemoveItem = async (id: number | undefined) => {
    if (!id) return;
    try {
      setIsUpdating(id);
      await api.delete(`order/delete/cartitem/${id}/`);
      setChangedCart(true);
      showSuccess("Item removed from cart");
    } catch (err) {
      console.error(err);
      showError("Failed to remove item");
    } finally {
      setIsUpdating(null);
    }
  };

  const updateQuantity = async (
    id: number | undefined,
    newQuantity: number,
  ) => {
    if (!id) return;
    if (newQuantity < 1) return;
    try {
      setIsUpdating(id);
      await api.patch(`order/update/cartitem/${id}/`, {
        quantity: newQuantity,
      });
      setChangedCart(true);
      showSuccess("Quantity updated");
    } catch (err) {
      console.error(err);
      showError("Failed to update quantity");
    } finally {
      setIsUpdating(null);
    }
  };

  // REFACTORED BATCH RUN ORDER ROUTE FOR MULTI-VARIANT SUPPORT
  const HandleOrder = async () => {
    // Collect specific structural variation tokens instead of flat product keys
    const productsToSend = cart.map((item) => ({
      variant_id: item.variant,
      quantity: item.quantity,
      size: item.size,
    }));

    try {
      setIsCheckingOut(true);
      const user: CustomUser | null = await fetchUser();
      if (!user || !user.id) {
        setUrl(pathname);
        router.push("/login");
        return;
      }

      await api.post("order/create/batchorder/", productsToSend);
      showSuccess("Batch variant order placed successfully!");
      setChangedCart(true);

      const productNames = cart.map((item) => item.product_name);
      setTimeout(() => {
        const message = `Hello ${user.username}, I just placed a batch order for: ${productNames.join(", ")}`;

        window.open(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
          "_blank",
        );
      }, 2000);
    } catch (err) {
      console.error(err);
      showError("Failed to process variation order");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      // Cast string decimal representations into numerical calculations safely
      const price =
        typeof item.product_price === "string"
          ? parseFloat(item.product_price)
          : item.product_price || 0;
      return total + price * item.quantity;
    }, 0);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen px-4 sm:px-8 md:px-16 lg:px-24 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] p-3 rounded-lg">
              <ShoppingCart size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1c2b3a]">
                Shopping Cart Workspace
              </h1>
              <p className="text-gray-600">
                {cart?.length > 0
                  ? `${cart.length} configuration option${cart.length > 1 ? "s" : ""} active`
                  : "Your cart is empty"}
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/orders")}
            className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white px-4 py-2 rounded-lg shadow-sm font-semibold text-sm flex items-center gap-2"
          >
            <Package size={16} /> <span>Track Orders</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle size={20} />
              {success}
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-6 h-24 animate-pulse"
              />
            ))}
          </div>
        ) : cart?.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="space-y-4"
              >
                {cart.map((item) => {
                  const itemPrice =
                    typeof item.product_price === "string"
                      ? parseFloat(item.product_price)
                      : item.product_price || 0;
                  return (
                    <motion.div
                      key={item.id ?? `${item.variant}-${item.product_image}`}
                      variants={itemVariants}
                      whileHover={{ y: -2 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all"
                    >
                      <div className="flex gap-4">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image
                            src={item.product_image || "/placeholder.svg"}
                            alt={item.product_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#1c2b3a] text-lg mb-1 truncate">
                            {item.product_name}
                          </h3>

                          {item.size && (
                            <p className="text-sm text-gray-500 mb-2">
                              Size:{" "}
                              <span className="font-semibold text-[#1c2b3a]">
                                {item.size}
                              </span>
                            </p>
                          )}

                          <p className="text-gray-600 text-sm mb-3">
                            ₦{itemPrice.toLocaleString()} each
                          </p>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                disabled={
                                  item.quantity <= 1 || isUpdating === item.id
                                }
                                className="p-2 text-gray-600 disabled:opacity-50"
                              >
                                <Minus size={14} />
                              </button>
                              <div className="px-4 text-center font-medium min-w-[40px] text-xs">
                                {isUpdating === item.id ? (
                                  <Loader2
                                    size={12}
                                    className="animate-spin mx-auto"
                                  />
                                ) : (
                                  item.quantity
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                disabled={
                                  item.quantity >= item.product_stock ||
                                  isUpdating === item.id
                                }
                                className="p-2 text-gray-600 disabled:opacity-50"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="text-xs text-gray-400">
                              {item.product_stock} variant options left
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between min-w-[100px]">
                          <p className="font-bold text-[#1c2b3a] text-lg">
                            ₦{(itemPrice * item.quantity).toLocaleString()}
                          </p>
                          <button
                            type="button"
                            onClick={() => RemoveItem(item.id)}
                            disabled={isUpdating === item.id}
                            className="text-red-600 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8 space-y-6"
              >
                <h2 className="text-xl font-bold text-[#1c2b3a]">
                  Order Summary
                </h2>
                <div className="space-y-4 text-sm border-b border-gray-100 pb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cart.length} items)</span>
                    <span className="font-semibold text-gray-900">
                      ₦{calculateTotal().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Handling</span>
                    <span className="text-green-600 font-medium">Free</span>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold text-[#1c2b3a]">
                  <span>Total Amount</span>
                  <span>₦{calculateTotal().toLocaleString()}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={HandleOrder}
                  disabled={isCheckingOut}
                  className="w-full bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white py-3.5 rounded-lg shadow-sm flex items-center justify-center gap-2 font-semibold"
                >
                  {isCheckingOut ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={16} />{" "}
                      <span>Authorize Checkout Deal</span>{" "}
                      <ArrowRight size={14} />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-12 text-center max-w-md mx-auto mt-12 flex flex-col items-center"
          >
            <div className="bg-gray-50 p-4 rounded-full mb-4">
              <Package size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-1">
              Your cart is currently empty
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Explore our campus catalog feed items to lock down selection
              options.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="bg-[#1c2b3a] text-white px-6 py-2 rounded-md text-sm font-medium"
            >
              Return to Home Feed
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Cart;
