import Image from "next/image";
import React from "react";

interface Productprops {
  product: {
    id: number;
    name: string;
    price: number;
    image: File | string;
    stock: number;
    sold: boolean;
    extra_field: {};
    categories: { id: number; name: string }[];
  };
}

const Product = ({ product }: Productprops) => {
  return (
    <div className="relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition bg-white flex flex-col items-center justify-center">
      {/* SOLD overlay */}
      {product.sold && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 z-10">
          <p className="text-white text-lg font-bold">SOLD OUT</p>
        </div>
      )}

      {/* Image */}
      <Image
        src={
          typeof product.image === "string"
            ? product.image
            : URL.createObjectURL(product.image)
        }
        alt={`Image of ${product.name}`}
        width={150}
        height={150}
        className="object-contain max-w-[150px] rounded"
      />

      {/* Product Info */}
      <div className=" py-3 text-center">
        <h3 className="text-lg font-semibold truncate">{product.name}</h3>
        <p className="text-[#EF4444] font-bold mt-1">
          ₦{product.price.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default Product;
