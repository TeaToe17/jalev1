"use client";

import Head from "next/head";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NextPage } from "next";

import book from "../../public/books.jpg";
import { fetchProducts } from "@/lib/utils";
import Product from "@/components/Product";

import Image from "next/image";

// Define the TypeScript interface for a single book

type HomeProps = NextPage & {
  fcmtoken?: string;
};

interface Product {
  id: number;
  name: string;
  price: number;
  image: File;
  stock: number;
  sold: boolean;
  extra_field: {};
  categories: { id: number; name: string }[];
}

function Home({ fcmtoken }: HomeProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await fetchProducts();
        setProducts(productsData);
      } catch (err: any) {
        console.log(error);
        setError(err.message);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((registration) => {
          console.log("Service Worker Registered:", registration);
        })
        .catch((err) =>
          console.log("Service Worker Registration Failed:", err)
        );
    }

    loadProducts();
  }, []);

  if (error) return <div>{error}</div>;
  return (
    <>
      <Head>
        <title>Jale, Market wey you fit price</title>
        <meta
          name="description"
          content="Buy and sell fairly used and new BOOKS"
        />
        <meta name="keywords" content="Books, Unilag, Buy, Sell, Items" />

        <meta property="og:title" content="Jale, anything books and more" />
        <meta
          property="og:description"
          content="Buy and sell fairly used and new BOOKS."
        />
        <meta property="og:image" content={book.src} />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Jale, anything books and more" />
        <meta
          name="twitter:description"
          content="Buy and sell fairly used and new BOOKS."
        />
        <meta name="twitter:image" content={book.src} />
      </Head>

      <main className="px-4 sm:px-8 md:px-16 lg:px-24 py-8 bg-[#f8f9fa] text-[#333] min-h-screen">
        <div className="text-center mb-12">
          <Image src="/jale logo.png" alt="Jàle Logo" width={80} height={80} className="mx-auto" />
          <h1 className="text-3xl md:text-5xl font-bold mt-4">Welcome to Jale</h1>
          <p className="text-base md:text-lg mt-2 text-gray-600">
            Market wey you fit Price...
          </p>
        </div>

        <section>
          <h2 className="text-xl md:text-2xl font-semibold mb-6">Available Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products &&
              products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => router.push(`/product/${product.id}`)}
                  className="cursor-pointer hover:shadow-lg transition rounded-xl overflow-hidden bg-white p-4"
                >
                  <Product product={product} />
                </div>
              ))}
          </div>
        </section>
      </main>
    </>
  );
}

export default Home;