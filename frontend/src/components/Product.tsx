import Image from "next/image";

interface Productprops {
  product: {
    id: number;
    name: string;
    price: string;
    image: string;
    imagefile: string;
    owner: number;
    stock: number;
    categories: number[];
    created: string;
    sold: boolean;
    negotiable: boolean;
    request: number | null;
    used: boolean;
    extra_field: { [key: string]: string };
    is_sticky: boolean;
  };
}

const Product = ({ product }: Productprops) => {
  // Function to check if an image URL is valid
  const isValidImageUrl = (url: string) => {
    return url && !url.includes("undefined") && !url.includes("null");
  };

  // Get a valid image URL or use placeholder
  const imageUrl = isValidImageUrl(product.image)
    ? `${product.image}?tr=w-600,q-85,f-auto`
    : "/placeholder.svg?height=200&width=300";

  return (
    <div className="h-full flex flex-col">
      <div className="relative h-64 overflow-hidden rounded-lg">
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: "cover" }}
          className="transition-transform hover:scale-110 duration-500"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg?height=200&width=300";
          }}
        />
        {product.negotiable && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
            Negotiable
          </div>
        )}
        {product.used && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            Used
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between mt-3">
        <div>
          <h3 className="font-medium text-[#1c2b3a] line-clamp-1">
            {product.name}
          </h3>
        </div>
        <div className="mt-2 flex justify-between items-center">
          <p className="font-bold text-[#1c2b3a]">
            ₦{(Number(product.price) * 0.9).toLocaleString()}
          </p>
          {product.stock > 0 ? (
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
              In Stock
            </span>
          ) : (
            <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
              Sold Out
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Product;
