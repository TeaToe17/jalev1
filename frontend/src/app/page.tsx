"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Flame,
  Zap,
  Star,
  Crown,
} from "lucide-react";
import { fetchProducts, fetchCategories } from "@/lib/utils";
import { AxiosError } from "axios";

// Define the TypeScript interface for a single product
interface Product {
  id: number;
  name: string;
  price: number;
  imagefile: File | string;
  image: string;
  stock: number;
  used: boolean;
  sold: boolean;
  negotiable: boolean;
  extra_field: Record<string | number, string | number | null>;
  categories: number[];
  owner: number;
  is_sticky: boolean;
  reserved: boolean;
}

// Featured banners
const banners = [
  {
    id: 1,
    title: "Books for Every Course",
    description: "Find textbooks and novels at student-friendly prices",
    image: "/books.jpg",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: 2,
    title: "Electronics & Gadgets",
    description: "Quality devices for your academic and personal needs",
    image: "/gadgets.jpg?height=400&width=800",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: 3,
    title: "Market wey you fit Price",
    description: "Negotiate directly with sellers for the best deals",
    image: "/store.jpeg?height=400&width=800",
    color: "from-[#fcecd8] to-[#1c2b3a]",
  },
];

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState(0);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const bannerInterval = useRef<NodeJS.Timeout | null>(null);
  const [categories, setCategories] = useState<
    { id: number; name: string; icon: string }[]
  >([]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const productsData = await fetchProducts();
        setProducts(productsData);
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
      const data = await fetchCategories();
      setCategories(data);
    };

    // if ("serviceWorker" in navigator) {
    //   navigator.serviceWorker
    //     .register("/firebase-messaging-sw.js")
    //     .then((registration) => {
    //       console.log("Service Worker Registered:", registration);
    //     })
    //     .catch((err) =>
    //       console.error("Service Worker Registration Failed:", err)
    //     );
    // }

    loadProducts();
    loadCategories();
  }, []);

  // Banner rotation
  useEffect(() => {
    bannerInterval.current = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => {
      if (bannerInterval.current) {
        clearInterval(bannerInterval.current);
      }
    };
  }, []);

  const handleBannerChange = (index: number) => {
    setCurrentBanner(index);
    // Reset the interval when manually changing
    if (bannerInterval.current) {
      clearInterval(bannerInterval.current);
      bannerInterval.current = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }, 5000);
    }
  };

  const filteredProducts = products?.filter((product) => {
    const hasSearch = !!searchQuery;
    const hasCategory = !!categoryQuery;

    const matchesSearch =
      hasSearch &&
      product.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      hasCategory && product.categories?.includes(Number(categoryQuery));

    // If both search and category are active, match both
    if (hasSearch && hasCategory) {
      return matchesSearch && matchesCategory;
    }

    // If only search is active
    if (hasSearch) {
      return matchesSearch;
    }

    // If only category is active
    if (hasCategory) {
      return matchesCategory;
    }

    // If neither is active, return all
    return true;
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading Products
          </h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white rounded-md hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center w-full md:w-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mr-4"
            >
              {/* <Image
                src="/jale logo.png"
                alt="Jàle Logo"
                width={40}
                height={40}
                className="rounded-full"
              /> */}
            </motion.div>
            <div className="relative flex-1 md:w-96">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 px-4 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] focus:border-transparent"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            {/* <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md transition-colors"
              onClick={() => router.push("/cart")}
            >
              <ShoppingCart size={20} />
              <span className="hidden sm:inline">Cart</span>
            </motion.button> */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-[#1c2b3a] px-4 py-2 rounded-md font-medium hover:bg-opacity-90 transition-colors"
              onClick={() => router.push("/myproducts")}
            >
              Sell on Jàle
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Categories Sidebar - Hidden on mobile, shown on tablet and up */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden md:block w-64 bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white font-semibold">
              Categories
            </div>
            <ul className="p-2">
              {categories?.map((category) => (
                <motion.li
                  key={category.id}
                  whileHover={{ backgroundColor: "#f3f4f6", x: 5 }}
                  className="cursor-pointer p-3 rounded-md transition-colors"
                  onClick={() => setCategoryQuery(category.id)}
                  // onClick={() => router.push(`/category/${category.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{category.icon}</span>
                    <span>{category.name}</span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Banner Carousel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative mb-8 rounded-xl overflow-hidden shadow-md h-[200px] sm:h-[300px] md:h-[350px]"
            >
              <div className="relative w-full h-full">
                {banners.map((banner, index) => (
                  <motion.div
                    key={banner.id}
                    className={`absolute inset-0 ${
                      index === currentBanner ? "block" : "hidden"
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: index === currentBanner ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${banner.color} opacity-80`}
                    ></div>
                    <Image
                      src={banner.image || "/placeholder.svg"}
                      alt={banner.title}
                      fill
                      style={{ objectFit: "cover" }}
                      className="z-0"
                    />
                    <div className="absolute inset-0 flex flex-col justify-center p-8 z-10 text-white">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                        {banner.title}
                      </h2>
                      <p className="text-sm sm:text-base md:text-lg max-w-md">
                        {banner.description}
                      </p>
                      {/* <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="mt-4 bg-white text-[#1c2b3a] px-4 py-2 rounded-md w-max font-medium"
                        onClick={() => router.push("/")}
                      >
                        Shop Now
                      </motion.button> */}
                    </div>
                  </motion.div>
                ))}

                {/* Banner Navigation */}
                <button
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-20"
                  onClick={() =>
                    handleBannerChange(
                      (currentBanner - 1 + banners.length) % banners.length
                    )
                  }
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-20"
                  onClick={() =>
                    handleBannerChange((currentBanner + 1) % banners.length)
                  }
                >
                  <ChevronRight size={20} />
                </button>

                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentBanner ? "bg-white" : "bg-white/50"
                      }`}
                      onClick={() => handleBannerChange(index)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Categories for Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:hidden mb-8 overflow-x-auto"
            >
              <div className="flex gap-3 pb-2">
                {categories?.map((category) => (
                  <motion.div
                    key={category.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0 flex flex-col items-center justify-center bg-white p-3 rounded-lg shadow-sm"
                    onClick={() => setCategoryQuery(category.id)}
                  >
                    <span className="text-2xl mb-1">{category.icon}</span>
                    <span className="text-xs whitespace-nowrap">
                      {category.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Products Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl md:text-2xl font-semibold text-[#1c2b3a]">
                  Available Products
                </h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-sm text-[#1c2b3a] font-medium flex items-center"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryQuery(0);
                  }}
                >
                  View All <ChevronRight size={16} />
                </motion.button>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl overflow-hidden shadow-sm p-3 h-64"
                    >
                      <div className="animate-pulse">
                        <div className="bg-gray-200 h-32 rounded-lg mb-3"></div>
                        <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
                        <div className="bg-gray-200 h-4 rounded w-1/2 mb-2"></div>
                        <div className="bg-gray-200 h-6 rounded w-1/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredProducts?.length > 0 ? (
                    filteredProducts.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={index}
                      />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-10">
                      <p className="text-gray-500 text-lg">No products found</p>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="mt-2 text-[#1c2b3a] font-medium hover:underline"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Product Card Component with animations
function ProductCard({ product, index }: { product: Product; index: number }) {
  const router = useRouter();

  const stickyVariants : Variants = {
    initial: {
      scale: 1,
      boxShadow: "0 0 0 rgba(255, 107, 0, 0)",
    },
    animate: {
      scale: [1, 1.02, 1],
      boxShadow: [
        "0 0 20px rgba(255, 107, 0, 0.3)",
        "0 0 30px rgba(255, 107, 0, 0.5)",
        "0 0 20px rgba(255, 107, 0, 0.3)",
      ],
      transition: {
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  };

  const fireAnimation : Variants = {
    animate: {
      y: [0, -2, 0],
      rotate: [0, 2, -2, 0],
      transition: {
        duration: 1.5,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  };

  const sparkleAnimation : Variants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        delay: Math.random() * 2,
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
      variants={product.is_sticky ? stickyVariants : {}}
      className={`relative rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer ${
        product.is_sticky
          ? "bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 border-2 border-orange-200"
          : "bg-white"
      }`}
      onClick={() => router.push(`/product/${product.id}`)}
    >
      {/* Sticky Product Special Effects */}
      {product.is_sticky && (
        <>
          {/* Animated Border Glow */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 opacity-20 animate-pulse" />

          {/* Fire Badge */}
          <motion.div
            variants={fireAnimation}
            animate="animate"
            className="absolute -top-2 -right-2 z-20 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full p-2 shadow-lg"
          >
            <Flame size={16} className="drop-shadow-sm" />
          </motion.div>

          {/* Crown Badge */}
          <motion.div
            variants={sparkleAnimation}
            animate="animate"
            className="absolute top-2 left-2 z-20 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full p-1.5 shadow-lg"
          >
            <Crown size={12} />
          </motion.div>

          {/* Floating Sparkles */}
          <motion.div
            variants={sparkleAnimation}
            animate="animate"
            className="absolute top-4 right-4 text-yellow-400"
          >
            <Star size={8} fill="currentColor" />
          </motion.div>

          <motion.div
            variants={sparkleAnimation}
            animate="animate"
            className="absolute top-8 right-8 text-orange-400"
          >
            <Zap size={6} fill="currentColor" />
          </motion.div>

          {/* Featured Ribbon */}
          <div className="absolute top-0 left-0 z-10">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 py-1 transform -rotate-45 -translate-x-2 -translate-y-1 shadow-lg">
              🔥 FEATURED
            </div>
          </div>

          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-red-400 to-pink-400 animate-pulse" />
          </div>
        </>
      )}

      <div className="relative h-40 overflow-hidden">
        <Image
          src={product.image || "/placeholder.svg?height=200&width=300"}
          alt={product.name}
          fill
          style={{ objectFit: "cover" }}
          className={`transition-transform hover:scale-110 duration-500 ${
            product.is_sticky ? "brightness-105 contrast-105" : ""
          }`}
        />

        {/* Enhanced badges for sticky products */}
        {product.negotiable && (
          <div
            className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-full ${
              product.is_sticky
                ? "bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg animate-pulse"
                : "bg-yellow-500"
            }`}
          >
            Negotiable
          </div>
        )}

        {product.used && (
          <div
            className={`absolute left-2 top-2 text-white text-xs px-2 py-1 rounded-full ${
              product.is_sticky
                ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg animate-pulse"
                : "bg-blue-500"
            }`}
          >
            Used
          </div>
        )}

        {product.stock == 1 && (
          <div
            className={`absolute left-2 bottom-2 text-white text-xs px-2 py-1 rounded-full ${
              product.is_sticky
                ? "bg-red-600 shadow-lg animate-pulse"
                : "bg-red-600"
            }`}
          >
            1 Left!
          </div>
        )}

        {product.reserved && (
          <div
            className={`absolute right-2 bottom-2 text-white text-xs px-2 py-1 rounded-full ${
              product.is_sticky
                ? "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] shadow-lg animate-pulse"
                : "bg-red-400"
            }`}
          >
            Ordered
          </div>
        )}

        {/* Special "HOT" overlay for sticky products */}
        {product.is_sticky && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="absolute bottom-2 left-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 0.5,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 2,
              }}
            >
              🔥
            </motion.div>
            HOT
          </motion.div>
        )}
      </div>

      <div
        className={`p-3 relative ${
          product.is_sticky
            ? "bg-gradient-to-br from-white/90 to-orange-50/90"
            : ""
        }`}
      >
        <h3
          className={`font-medium line-clamp-1 ${
            product.is_sticky
              ? "text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 font-semibold"
              : "text-[#1c2b3a]"
          }`}
        >
          {product.name}
        </h3>

        <div className="mt-2 flex justify-between items-center">
          <p
            className={`font-bold ${
              product.is_sticky
                ? "text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 text-lg"
                : "text-[#1c2b3a]"
            }`}
          >
            ₦{product.price.toLocaleString()}
          </p>

          {product.stock > 0 ? (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                product.is_sticky
                  ? "text-green-700 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 shadow-sm"
                  : "text-green-600 bg-green-100"
              }`}
            >
              In Stock
            </span>
          ) : (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                product.is_sticky
                  ? "text-red-700 bg-gradient-to-r from-red-100 to-pink-100 border border-red-200 shadow-sm"
                  : "text-red-600 bg-red-100"
              }`}
            >
              Sold Out
            </span>
          )}
        </div>

        {/* Special "Trending" indicator for sticky products */}
        {product.is_sticky && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-2 flex items-center gap-1 text-xs text-orange-600 font-medium"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
            >
              ⚡
            </motion.div>
            Trending Now
          </motion.div>
        )}
      </div>

      {/* Sticky product glow effect */}
      {product.is_sticky && (
        <div className="absolute inset-0 rounded-xl pointer-events-none">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-400/10 via-red-400/10 to-pink-400/10 animate-pulse" />
        </div>
      )}
    </motion.div>
  );
}
