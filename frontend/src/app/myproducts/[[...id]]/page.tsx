"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-toastify";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { AxiosError } from "axios";
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Upload,
  Loader2,
  Tag,
  Package,
  DollarSign,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Star,
  Gift,
} from "lucide-react";
import api from "@/lib/api";
import ProductComponent from "@/components/Product";
import { fetchProducts, fetchCategories, getUser, IsUser } from "@/lib/utils";

interface Category {
  id: number;
  name: string;
  icon?: string;
}

interface Product {
  id: number;
  name: string;
  categories: Category[];
  created: string;
  owner: number;
  is_sticky: boolean;
  sticky_timestamp: string | null;
  price: string | number;
  image: string;
  sku: string;
  stock: number;
  attributes: Record<string, string | number | null>;
}

interface FrontEndVariantInput {
  id?: number;
  price: string;
  stock: string;
  sizes: string[];
  sizeInput: string;
  used: boolean;
  negotiable: boolean;
  attributes: Array<{ key: string; value: string }>;
  imagefile: File | null;
  previewUrl: string | null;
  is_preferred: boolean;
}

type CustomUser = {
  id: number;
  username: string;
  whatsapp: string;
  call: string;
  image: string;
  email: string;
  referral_points: number;
  categories: number[];
};

const MyProducts = () => {
  const router = useRouter();
  const [user, setUser] = useState<CustomUser | null>();
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { id: paramId } = useParams<{ id: string }>();
  const [requestId, setRequestId] = useState<string | null>(paramId || null);
  const [name, setName] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [variants, setVariants] = useState<FrontEndVariantInput[]>([
    {
      price: "",
      stock: "1",
      sizes: [],
      sizeInput: "",
      used: false,
      negotiable: false,
      attributes: [{ key: "", value: "" }],
      imagefile: null,
      previewUrl: null,
      is_preferred: true,
    },
  ]);

  const addVariantCard = () => {
    setVariants((prev) => [
      ...prev,
      {
        price: "",
        stock: "1",
        sizes: [],
        sizeInput: "",
        used: false,
        negotiable: false,
        attributes: [{ key: "", value: "" }],
        imagefile: null,
        previewUrl: null,
        is_preferred: prev.length === 0 ? true : false,
      },
    ]);
  };

  const removeVariantCard = async (
    variantId: number | undefined,
    index: number,
  ) => {
    if (!variantId) return;
    if (variants.length === 1) {
      setError(
        "A product must feature at least one variant card configuration.",
      );
      return;
    }
    const wasPreferred = variants[index].is_preferred;
    const updated = variants.filter((_, idx) => idx !== index);
    if (wasPreferred && updated.length > 0) {
      updated[0].is_preferred = true;
    }
    try {
      api.delete(`product/variant/delete/${variantId}/`);
      setVariants(updated);
    } catch (err) {
      console.log(err);
    }
  };

  const updateVariantField = (
    index: number,
    field: keyof FrontEndVariantInput,
    value: any,
  ) => {
    setVariants((prev) =>
      prev.map((v, idx) => {
        if (idx === index) {
          return { ...v, [field]: value };
        }
        if (field === "is_preferred" && value === true) {
          return { ...v, is_preferred: false };
        }
        return v;
      }),
    );
  };

  const addVariantSize = (index: number) => {
    const variant = variants[index];
    const size = variant?.sizeInput.trim();

    if (!size) return;

    // Prevent duplicate sizes within the same variant.
    if (
      variant.sizes.some(
        (existingSize) => existingSize.toLowerCase() === size.toLowerCase(),
      )
    ) {
      setError(`Size "${size}" has already been added.`);
      return;
    }

    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === index
          ? {
              ...v,
              sizes: [...v.sizes, size],
              sizeInput: "",
            }
          : v,
      ),
    );

    setError("");
  };

  const removeVariantSize = (variantIndex: number, sizeToRemove: string) => {
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === variantIndex
          ? {
              ...v,
              sizes: v.sizes.filter((size) => size !== sizeToRemove),
            }
          : v,
      ),
    );
  };

  const addAttributeRow = (vIndex: number) => {
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === vIndex
          ? { ...v, attributes: [...v.attributes, { key: "", value: "" }] }
          : v,
      ),
    );
  };

  const removeAttributeRow = (vIndex: number, attrIdx: number) => {
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === vIndex
          ? {
              ...v,
              attributes: v.attributes.filter((_, aIdx) => aIdx !== attrIdx),
            }
          : v,
      ),
    );
  };

  const updateAttributeRow = (
    vIndex: number,
    attrIdx: number,
    field: "key" | "value",
    val: string,
  ) => {
    setVariants((prev) =>
      prev.map((v, idx) => {
        if (idx === vIndex) {
          const updatedAttrs = v.attributes.map((attr, aIdx) =>
            aIdx === attrIdx ? { ...attr, [field]: val } : attr,
          );
          return { ...v, attributes: updatedAttrs };
        }
        return v;
      }),
    );
  };

  const handleCheckboxChange = (id: number) => {
    setSelectedCategories((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((catId) => catId !== id)
        : [...prevSelected, id],
    );
  };

  const loadProducts = async () => {
    setIsLoading(true);

    try {
      const ownerId = user?.id;

      if (ownerId) {
        const data = await fetchProducts(page, ownerId);
        setProducts(data.results);
        setNextPage(data.next);
        setPreviousPage(data.previous);
        setTotalCount(data.count);
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        console.error(err);
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const CategoriesData = await fetchCategories();
      setCategories(CategoriesData);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUser = async () => {
    try {
      const data = await getUser();
      if (data) setUser(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.id) loadProducts();
  }, [user, page]);

  useEffect(() => {
    loadUser();
    loadCategories();
  }, []);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const sendPayload = async (method: "POST" | "PUT", url: string) => {
    setIsSubmitting(true);
    setError("");
    if (selectedCategories.length === 0) {
      setError("Please select at least one category mapping.");
      setIsSubmitting(false);
      return;
    }
    const formData = new FormData();
    formData.append("name", name);
    selectedCategories.forEach((catId) =>
      formData.append("categories", catId.toString()),
    );
    if (requestId && method === "POST") {
      formData.append("request", requestId);
    }
    variants.forEach((v, idx) => {
      if (v.id) formData.append(`variants[${idx}]id`, v.id.toString());
      formData.append(`variants[${idx}]price`, v.price);
      formData.append(
        `variants[${idx}]stock`,
        (parseInt(v.stock) || 1).toString(),
      );
      formData.append(`variants[${idx}]sizes`, JSON.stringify(v.sizes));
      formData.append(`variants[${idx}]used`, v.used.toString());
      formData.append(`variants[${idx}]negotiable`, v.negotiable.toString());
      formData.append(
        `variants[${idx}]is_preferred`,
        v.is_preferred.toString(),
      );

      const attributesObj: Record<string, string> = {};
      v.attributes.forEach((attr) => {
        const cleanKey = attr.key.trim().toLowerCase().replace(/\s+/g, "_");
        if (cleanKey && attr.value.trim()) {
          attributesObj[cleanKey] = attr.value.trim();
        }
      });

      formData.append(
        `variants[${idx}]attributes`,
        JSON.stringify(attributesObj),
      );

      if (v.imagefile) {
        formData.append(`variants[${idx}]imagefile`, v.imagefile);
      }
    });

    try {
      await api({
        method,
        url,
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      showSuccess(
        method === "POST"
          ? "Product published successfully!"
          : "Product profile updated successfully!",
      );
      loadProducts();
      resetForm();
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const backendError =
          error.response?.data?.variants ||
          error.response?.data?.error ||
          JSON.stringify(error.response?.data) ||
          "Transaction execution failure.";
        setError(
          typeof backendError === "object"
            ? JSON.stringify(backendError)
            : backendError,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const createProduct = (e: React.FormEvent) => {
    e.preventDefault();
    sendPayload("POST", "product/create/");
  };

  const updateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentProduct)
      sendPayload("PUT", `product/update/${currentProduct.id}/`);
  };

  const makeProductSticky = async () => {
    if (!currentProduct) return;

    if (Number(user?.referral_points) < 1) {
      setError("Insufficient referral points. You need at least 1 point.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`product/make_sticky/${currentProduct.id}/`);
      showSuccess(
        "Product made featured successfully! 1 referral point deducted.",
      );

      if (user) {
        setUser({
          ...user,
          referral_points: user.referral_points - 1,
        });
      }

      loadProducts();
      setCurrentProduct(null);
      setEditMode(false);
      resetForm();
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.error("Error making product sticky:", error);
        setError(
          error.response?.data?.message || "Failed to make product featured",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditProduct = async (product: Product) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentProduct(product);
    setName(product.name);
    setSelectedCategories(product.categories.map((c) => c.id) || []);
    setEditMode(true);
    try {
      const detailResponse = await api.get(`product/detail/${product.id}/`);
      const fullVariantsList: any[] = detailResponse.data.variants || [];
      setVariants(
        fullVariantsList.map((v, idx) => ({
          id: v.id,
          price: v.price.toString(),
          stock: v.stock.toString(),
          sizes: Array.isArray(v.sizes) ? v.sizes : [],
          sizeInput: "",
          used: v.used,
          negotiable: v.negotiable,
          is_preferred:
            v.is_preferred !== undefined ? v.is_preferred : idx === 0,
          attributes: Object.entries(v.attributes || {}).map(([key, val]) => ({
            key: key.replace(/_/g, " "),
            value: String(val),
          })),
          imagefile: null,
          previewUrl: v.image,
        })),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProduct = (product: Product) => {
    const toastId = toast(
      () => (
        <div className="text-sm">
          <p>Delete entire product entry?</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(toastId);
                try {
                  await api.delete(`product/delete/${product.id}/`);
                  toast.success("Deleted successfully!");
                  loadProducts();
                } catch {
                  toast.error("Failed deletion.");
                }
              }}
              className="bg-red-600 text-white px-3 py-1 rounded text-xs"
            >
              Yes
            </button>
            <button
              onClick={() => toast.dismiss(toastId)}
              className="bg-gray-200 px-3 py-1 rounded text-xs"
            >
              No
            </button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false, position: "top-center" },
    );
  };

  const resetForm = () => {
    setName("");
    setSelectedCategories([]);
    setVariants([
      {
        price: "",
        stock: "1",
        sizes: [],
        sizeInput: "",
        used: false,
        negotiable: false,
        attributes: [{ key: "", value: "" }],
        imagefile: null,
        previewUrl: null,
        is_preferred: true,
      },
    ]);
    setEditMode(false);
    setCurrentProduct(null);
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen px-4 sm:px-8 md:px-16 lg:px-24 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#1c2b3a]">
            {editMode ? "Edit Product Settings" : "Publish a Product Entry"}
          </h1>
          {editMode && (
            <button
              onClick={resetForm}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 text-sm"
            >
              <X size={16} /> Cancel
            </button>
          )}
        </div>
        <AnimatePresence>
          {success && (
            <div className="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle size={20} />
              {success}
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </AnimatePresence>
        <form
          onSubmit={editMode ? updateProduct : createProduct}
          className="bg-white p-6 rounded-xl shadow-md space-y-6"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                placeholder="e.g. Air Force 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1c2b3a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Tags
              </label>
              <div className="flex flex-wrap gap-2 border p-3 rounded-md">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${selectedCategories.includes(cat.id) ? "bg-[#1c2b3a] text-white" : "bg-gray-100 text-gray-700"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => handleCheckboxChange(cat.id)}
                      className="sr-only"
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* REFERRAL POINTS SECTION - Product Level */}
            {editMode &&
              currentProduct &&
              Number(user?.referral_points) > 0 &&
              !currentProduct.is_sticky && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-2 rounded-lg">
                      <Gift size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Use Referral Points
                      </h3>
                      <p className="text-xs text-gray-600">
                        Make your product featured for better visibility
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm">
                      <span className="text-gray-600">Available Points: </span>
                      <span className="font-semibold text-green-600">
                        {user?.referral_points}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Cost: </span>
                      <span className="font-semibold text-orange-600">
                        1 point
                      </span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={makeProductSticky}
                    disabled={isSubmitting || Number(user?.referral_points) < 1}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      Number(user?.referral_points) < 1 || isSubmitting
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white shadow-sm"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Gift size={16} />
                        <span>Make Featured (1 Point)</span>
                      </>
                    )}
                  </motion.button>

                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Featured products get better visibility and appear at the
                    top of search results
                  </p>
                </div>
              )}

            {editMode && currentProduct?.is_sticky && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-indigo-400 to-purple-400 p-2 rounded-lg">
                    <Star size={20} className="text-white fill-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Product is Featured
                    </h3>
                    <p className="text-xs text-gray-600">
                      {currentProduct.sticky_timestamp
                        ? `Featured until: ${new Date(currentProduct.sticky_timestamp).toLocaleString()}`
                        : "This product is featured for better visibility"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#1c2b3a]">
                Variation Parameters
              </h2>
              <button
                type="button"
                onClick={addVariantCard}
                className="text-sm border border-[#1c2b3a]/20 px-3 py-1.5 rounded-md bg-gray-50 flex items-center gap-1"
              >
                <Plus size={16} /> Add Variant Option
              </button>
            </div>
            <div className="space-y-6">
              {variants.map((variant, vIdx) => (
                <div
                  key={vIdx}
                  className={`p-4 border rounded-xl bg-gray-50/50 space-y-4 relative transition-all ${variant.is_preferred ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10" : "border-gray-200"}`}
                >
                  <button
                    type="button"
                    onClick={() => removeVariantCard(variant.id, vIdx)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center gap-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">
                      Configuration Card #{vIdx + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        updateVariantField(vIdx, "is_preferred", true)
                      }
                      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 border transition-all ${variant.is_preferred ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                    >
                      <Star
                        size={12}
                        fill={variant.is_preferred ? "currentColor" : "none"}
                      />
                      {variant.is_preferred
                        ? "Preferred Selection"
                        : "Set as Preferred"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Price (₦)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) =>
                          updateVariantField(vIdx, "price", e.target.value)
                        }
                        required
                        className="w-full px-3 py-1.5 border rounded-md text-sm bg-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Stock Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={variant.stock}
                        onChange={(e) =>
                          updateVariantField(vIdx, "stock", e.target.value)
                        }
                        required
                        className="w-full px-3 py-1.5 border rounded-md text-sm bg-white"
                      />
                    </div>
                    <div className="flex gap-4 pt-5">
                      <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={variant.used}
                          onChange={(e) =>
                            updateVariantField(vIdx, "used", e.target.checked)
                          }
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />{" "}
                        <span>Used Item</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={variant.negotiable}
                          onChange={(e) =>
                            updateVariantField(
                              vIdx,
                              "negotiable",
                              e.target.checked,
                            )
                          }
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />{" "}
                        <span>Negotiable</span>
                      </label>
                    </div>

                    {/* Optional Variant Sizes */}
                    <div className="border-t border-dashed border-gray-200 pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700">
                            Available Sizes
                            <span className="ml-2 font-normal text-gray-400">
                              Optional
                            </span>
                          </label>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Add clothing sizes, shoe sizes, or any other size
                            options.
                          </p>
                        </div>

                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full whitespace-nowrap">
                          {variant.sizes.length} added
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={variant.sizeInput}
                          onChange={(e) =>
                            updateVariantField(
                              vIdx,
                              "sizeInput",
                              e.target.value,
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addVariantSize(vIdx);
                            }
                          }}
                          placeholder="e.g. M, XL, 40, 42"
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                        />

                        <button
                          type="button"
                          onClick={() => addVariantSize(vIdx)}
                          disabled={!variant.sizeInput.trim()}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#1c2b3a] text-white hover:bg-[#293d52] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus size={15} />
                          Add Size
                        </button>
                      </div>

                      {variant.sizes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {variant.sizes.map((size) => (
                            <span
                              key={size}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                            >
                              {size}

                              <button
                                type="button"
                                onClick={() => removeVariantSize(vIdx, size)}
                                aria-label={`Remove size ${size}`}
                                className="text-indigo-400 hover:text-red-500 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">
                          No sizes added. This variant will have no size
                          options.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-dashed pt-4 space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-gray-600">
                        Custom Attributes Specifications
                      </label>
                      <button
                        type="button"
                        onClick={() => addAttributeRow(vIdx)}
                        className="text-[11px] text-indigo-600 font-bold flex items-center gap-0.5"
                      >
                        <PlusCircle size={12} /> Add Spec Field
                      </button>
                    </div>
                    {variant.attributes.map((attr, aIdx) => (
                      <div key={aIdx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Metric Key (e.g. size, color)"
                          value={attr.key}
                          onChange={(e) =>
                            updateAttributeRow(
                              vIdx,
                              aIdx,
                              "key",
                              e.target.value,
                            )
                          }
                          className="flex-1 px-3 py-1 border rounded-md text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. 44, Crimson)"
                          value={attr.value}
                          onChange={(e) =>
                            updateAttributeRow(
                              vIdx,
                              aIdx,
                              "value",
                              e.target.value,
                            )
                          }
                          className="flex-1 px-3 py-1 border rounded-md text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttributeRow(vIdx, aIdx)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <div
                      className="border border-dashed rounded-lg p-3 text-center bg-white cursor-pointer"
                      onClick={() =>
                        document.getElementById(`img-${vIdx}`)?.click()
                      }
                    >
                      <input
                        id={`img-${vIdx}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            updateVariantField(vIdx, "imagefile", file);
                            updateVariantField(
                              vIdx,
                              "previewUrl",
                              URL.createObjectURL(file),
                            );
                          }
                        }}
                      />
                      {variant.previewUrl ? (
                        <div className="relative h-20 w-full">
                          <Image
                            src={variant.previewUrl}
                            alt="Preview"
                            fill
                            style={{ objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 py-1 flex flex-col items-center">
                          <Upload size={16} /> Upload configuration photo track
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1c2b3a] text-white py-3 rounded-md flex items-center justify-center gap-2 font-medium"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : editMode ? (
              "Update Changes"
            ) : (
              "Publish Configuration"
            )}
          </button>
        </form>
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold text-[#1c2b3a]">
            Active Inventory Logs
          </h2>
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden border"
            >
              <div className="p-4 bg-gray-50 flex justify-between items-center border-b">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#1c2b3a]">{product.name}</h3>
                    {product.is_sticky && (
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Star size={10} className="fill-current" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {product.categories?.map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditProduct(product)}
                    className="text-xs border px-3 py-1.5 rounded bg-white font-medium flex items-center gap-1"
                  >
                    <Edit size={12} /> Manage
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProduct(product)}
                    className="text-xs border px-3 py-1.5 rounded bg-red-50 text-red-600 font-medium flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
              <div className="p-4 text-sm text-gray-600 flex items-center gap-6 flex-wrap">
                <div className="relative aspect-square w-14 sm:w-16 md:w-20 border rounded bg-gray-50 shrink-0 overflow-hidden">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt="Item Face"
                    width={80}
                    height={80}
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400">
                    PROXY IDENTIFIER SKU
                  </p>
                  <p className="font-mono text-xs">{product.sku || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400">PROXY STOCK</p>
                  <p className="font-semibold">
                    {product.stock || 0} units remaining
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400">
                    FLATTENED BASE PRICE
                  </p>
                  <p className="font-bold text-gray-900">
                    ₦{Number(product.price || 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex-1 flex flex-wrap gap-1 justify-end">
                  {Object.entries(product.attributes || {}).map(([k, v]) => (
                    <span
                      key={k}
                      className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded font-mono"
                    >
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {/* Pagination Buttons */}
          {products && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                disabled={!previousPage}
                onClick={() => setPage((prev) => prev - 1)}
                className="px-4 py-2 rounded-md bg-[#1c2b3a] text-white disabled:opacity-50"
              >
                Previous
              </button>

              <span className="font-medium">Page {page}</span>

              <button
                disabled={!nextPage}
                onClick={() => setPage((prev) => prev + 1)}
                className="px-4 py-2 rounded-md bg-[#1c2b3a] text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProducts;
