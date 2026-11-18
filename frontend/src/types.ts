export type Category = {
  id: number;
  name: string;
  icon: string;
};

export interface ProductVariant {
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
  datesold: string | null;
  request: number | null;
  is_preferred: boolean;
  product_name: string;
}

export type Product = {
  id: number;
  name: string;
  categories: Category[];
  created: string;
  owner: number;
  is_sticky: boolean;
  sticky_timestamp: string | null;

  price: number | string;
  image: string | null;
  sku: string;
  stock: number;
  attributes: Record<string, string | number | null>;

  // Billing information
  chargeable_clicks: number;
  lastclearance: string;
  cleared: boolean;
};

export type PaginatedProducts = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
  total_monthly_bill: number;
};
