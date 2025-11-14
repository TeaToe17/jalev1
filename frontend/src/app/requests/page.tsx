"use client";

import api from "@/lib/api";
import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppContext } from "@/context";
import { ACCESS_TOKEN } from "@/lib/constant";
import { motion, Variants } from "framer-motion";
import { Upload, Loader2, AlertCircle, Check } from "lucide-react";
import Image from "next/image";
import { AxiosError } from "axios";

interface Request {
  id: number;
  name: string;
  image: string;
  imagefile: string;
  description: string;
}

const Requests = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { setUrl } = useAppContext();

  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("request/list/");
      setRequests(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        if (err.response && err.response.data) {
          setError(err.response.data.message || "Failed to fetch requests");
        } else {
          setError("An unexpected error occurred");
        }
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const useIsLoggedIn = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem(ACCESS_TOKEN);
        setIsLoggedIn(!!token);
      }
    }, []);

    return isLoggedIn;
  };

  const [productName, setProductName] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [description, setDescription] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isLoggedIn = useIsLoggedIn();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setImage(null);
      setPreviewUrl(null);
    }
  };

  const CreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", productName);
    if (image) formData.append("imagefile", image);
    formData.append("description", description);

    try {
      const response = await api.post("request/create/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMessage("Request successfully placed!");
      setTimeout(() => setSuccessMessage(null), 3000);

      fetchRequests();

      // Open WhatsApp in a new tab
      window.open(
        `https://wa.me/2347046938727?text=Hello%20%0AI%20just%20made%20a%20request%20for%20${encodeURIComponent(
          productName ?? ""
        )}%20`,
        "_blank"
      );

      setRequests((prev) => [...prev, response.data]);
      setProductName("");
      setImage(null);
      setPreviewUrl(null);
      setDescription("");
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        console.error("Failed to create request:", err);
        setError(err.response?.data?.message || "Failed to create request");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const CreateProduct = (request: Request) => {
    if (isLoggedIn) {
      router.push(`/myproducts/${request.id}/`);
    } else {
      setUrl("myproducts/" + request.id);
      router.push(`/login/`);
    }
  };

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen px-4 sm:px-8 md:px-16 lg:px-24 py-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-[#1c2b3a]">
          Product Requests
        </h1>
        <p className="text-gray-600 mt-2">
          Find what you are looking for or help others find what they need
        </p>
      </motion.div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          <p>{error}</p>
        </motion.div>
      )}

      {/* Success message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <Check size={20} />
          <p>{successMessage}</p>
        </motion.div>
      )}

      {/* Request prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="text-lg font-medium text-[#1c2b3a]">
          Did not find a Product? Place a request below:
        </p>
      </motion.div>

      {/* Create Request Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
      >
        {isLoggedIn ? (
          <form onSubmit={CreateRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 md:col-span-1">
                <div>
                  <label
                    htmlFor="productName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Product Name
                  </label>
                  <input
                    id="productName"
                    type="text"
                    placeholder="Name of Product"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] focus:border-transparent transition-colors"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    placeholder="Describe what you're looking for"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] focus:border-transparent transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4 md:col-span-1">
                <div>
                  <label
                    htmlFor="image"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Image (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label htmlFor="image" className="cursor-pointer">
                      {previewUrl ? (
                        <div className="relative h-40 w-full">
                          <Image
                            src={previewUrl || "/placeholder.svg"}
                            alt="Preview"
                            fill
                            style={{ objectFit: "contain" }}
                            className="rounded-md"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4">
                          <Upload className="h-10 w-10 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">
                            Click to upload an image
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] hover:opacity-90 text-white px-6 py-3 rounded-md shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Request</span>
              )}
            </motion.button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 space-y-4"
          >
            <p className="text-gray-700">Login to create a product request</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setUrl(pathname);
                router.push("/login");
              }}
              className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] hover:opacity-90 text-white px-6 py-2 rounded-md shadow-sm transition-all"
            >
              Login to Continue
            </motion.button>
          </motion.div>
        )}
      </motion.div>

      {/* Requested Products List */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-[#1c2b3a]">
            Requested Products
          </h2>
          <button
            onClick={fetchRequests}
            className="text-[#1c2b3a] hover:text-opacity-70 text-sm font-medium flex items-center gap-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-40 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : requests.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {requests.map((request) => (
              <motion.div
                key={request.id}
                variants={itemVariants}
                whileHover={{
                  y: -5,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                }}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 transition-all"
              >
                <div className="relative h-48 w-full bg-gray-100">
                  <Image
                    src={
                      `${request.image}?tr=w-600,q-85,f-auto` ||
                      "/placeholder.svg?height=200&width=300"
                    }
                    alt={request.name}
                    fill
                    style={{ objectFit: "cover" }}
                    className="transition-transform hover:scale-105 duration-500"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-[#1c2b3a] line-clamp-1">
                    {request.name}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {request.description}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => CreateProduct(request)}
                    className="w-full mt-2 bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 text-white px-4 py-2 rounded-md shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>I Have This</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl shadow-sm p-8 text-center"
          >
            <p className="text-gray-500">
              No requests found. Be the first to request a product!
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Requests;
