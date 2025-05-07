"use client";

import api from "@/lib/api";

import { useAppContext } from "@/context";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchCategories, fetchProducts, getDecodedToken } from "@/lib/utils";
import Product from "@/components/Product";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { ACCESS_TOKEN } from "@/lib/constant";

interface CustomUser {
  id: number;
  name: string;
  whatsapp: string;
  call: string;
  image: string;
  categories: number[];
}

interface DecodedToken {
  CustomUser: CustomUser;
  exp: number;
  iat: number;
  jti: string;
  token_type: string;
  user_id: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  image: File;
  stock: number;
  description: string;
  new: boolean;
  sold: boolean;
  extra_field: {};
  categories: number[];
  // categories: { id: number; name: string }[];
  owner: number;
}

interface CustomJwtPayload {
  exp?: number; // Standard JWT expiration field
  iat?: number; // Standard JWT issued-at field
  CustomUser?: CustomUser; // Your custom user field
}

const ProductDetails = () => {
  const router = useRouter();
  const pathname = usePathname();

  const { id } = useParams(); // Dynamically fetch ID from the route
  const [product, setProduct] = useState<Product | null>(null);
  const { setUrl, setCurrentProduct } = useAppContext();

  const [categories, setCategories] =
    useState<{ id: number; name: string }[]>();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (id) {
      const loadProducts = async () => {
        try {
          const res: Product[] = await fetchProducts();
          if (res) {
            const product = res.find((b) => b.id === Number(id));
            setProduct(product || null);
          }
        } catch (error) {
          console.log("Error fetching product details:", error);
        }
      };
      loadProducts();
    }
  }, [id]);

  useEffect(() => {
    // load Categories
    const loadCategories = async () => {
      try {
        const CategoriesData = await fetchCategories();
        setCategories(CategoriesData);
      } catch (err: any) {
        setError(err.message);
        console.log(err.message);
      }
    };

    loadCategories();
  }, []);

  const HandleOrder = async () => {
    try {
      // Ensure localStorage access is safe
      if (typeof window === "undefined" || !window.localStorage) {
        throw new Error("localStorage is not available");
      }

      const token = localStorage.getItem(ACCESS_TOKEN);
      if (!token) {
        setUrl(pathname);
        router.push("/login");
        return;
      }

      // Decode the token safely
      let decoded: DecodedToken | undefined;
      if (decoded) {
        try {
          decoded = getDecodedToken();
        } catch (decodeError) {
          console.error("Error decoding token:", decodeError);
          alert("Session invalid, please log in again.");
          setUrl(pathname);
          router.push("/login");
          return;
        }
      }

      const { CustomUser } = decoded || {};
      if (!CustomUser) {
        alert("Invalid user information. Please log in again.");
        setUrl(pathname);
        router.push("/login");
        return;
      }

      const formData = new FormData();
      formData.append("product", product?.id?.toString() ?? "Missing Book ID");
      formData.append("buyer_name", CustomUser.name ?? "Missing Name");
      formData.append(
        "buyer_whatsapp_contact",
        CustomUser.whatsapp ?? "Missing WhatsApp"
      );
      formData.append("buyer_call_contact", CustomUser.call ?? "Missing Call");

      // Log form data for debugging (optional)
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      // API call with error handling
      try {
        console.log(formData);
        await api.post("order/create/", formData);
        alert("Order successfully placed!");
        router.push(
          `https://wa.me/2348152207142?text=Hello%20I%20am%20${encodeURIComponent(
            CustomUser.name
          )},%0AI%20just%20placed%20an%20order%20for%20${encodeURIComponent(
            product?.name ?? ""
          )}%20(${product?.id})`
        );
      } catch (apiError) {
        console.error("API Error:", apiError);
        alert("Error placing the order. Please try again.");
      }
    } catch (error) {
      console.error("Unexpected error in HandleOrder:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const HandleNegotiation = (receiverId: number) => {
    if (product && receiverId) {
      setCurrentProduct(product);
      router.push(`/chat/${receiverId}`);
    }
    if (receiverId) {
    }
  };

  if (!id) {
    return <p>Loading ID...</p>; // Temporary message while `id` resolves
  }

  if (!product) {
    return <p> Loading book details...</p>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  // <p>
  //   {product.categories // Get key-value pairs from the dictionary
  //     .map((categoryId) => {
  //       // Find the category in the categories state based on the value (categoryId)
  //       const category = categories?.find((cat) => cat.id === categoryId);
  //       return category ? category.name : null; // Return category name or null if not found
  //     })
  //     .filter((name) => name) // Remove null or undefined values
  //     .join(", ")}{" "}
  //   {/* Join names with commas */}
  // </p>{" "}
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 sm:px-8 md:px-16 lg:px-32 py-10">
      <div className="bg-white rounded-xl shadow-md p-6 flex flex-col md:flex-row gap-8">
        {/* Image */}
        <div className="flex-shrink-0">
          <Image
            src={
              typeof product.image === "string"
                ? product.image
                : URL.createObjectURL(product.image)
            }
            alt={product.name}
            width={300}
            height={400}
            className="rounded-lg object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex-grow space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#111]">
            {product.name}
          </h1>
          <p className="text-[#EF4444] text-xl font-semibold">
            ₦{product.price.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">
            Categories:{" "}
            <span className="text-gray-800">
                {product.categories // Get key-value pairs from the dictionary
                  .map((categoryId) => {
                    // Find the category in the categories state based on the value (categoryId)
                    const category = categories?.find(
                      (cat) => cat.id === categoryId
                    );
                    return category ? category.name : null; // Return category name or null if not found
                  })
                  .filter((name) => name) // Remove null or undefined values
                  .join(", ")}{" "}
                {/* Join names with commas */}
            </span>
          </p>
          <p className="text-base">
            {product.description || "No description."}
          </p>

          {product.sold ? (
            <span className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full">
              Sold Out
            </span>
          ) : (
            <div className="flex gap-4 mt-4">
              <button
                onClick={HandleOrder}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
              >
                Place Order
              </button>
              {!product.new && (
                <button
                  onClick={() => HandleNegotiation(product.owner)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow"
                >
                  Negotiate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default ProductDetails;
