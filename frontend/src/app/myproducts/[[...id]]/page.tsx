"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

import api from "@/lib/api";
import Product from "@/components/Product";
import {
  fetchBooks,
  fetchProducts,
  fetchCategories,
  fetchUser,
} from "@/lib/utils";

const MyProducts = () => {
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
    categories: { id: number; name: string }[];
  }

  const [ownerId, setOwnerId] = useState<number | string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string>("");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [cKey, setCkey] = useState<string | null>("");
  const [cValue, setCvalue] = useState<string | null>("");
  const [editFeatureMode, setEditFeatureMode] = useState<boolean>(false);
  const [oldKey, setOldKey] = useState<string | null>("");

  const { id: paramId } = useParams<{ id: string }>();
  const [requestId, setRequestId] = useState<string | null>(paramId || null);

  // Controlled inputs
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<number | string>("");
  const [stock, setStock] = useState<number | string>("");
  const [description, setDescription] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [fairlyUsed, setFairlyUsed] = useState<boolean>(false);
  const [extraField, setExtraField] = useState<{ [key: string]: string }>({});

  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  // Handle category checkbox change
  const handleCheckboxChange = (id: number) => {
    setSelectedCategories((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((catId) => catId !== id)
        : [...prevSelected, id]
    );
  };

  const loadProducts = async () => {
    try {
      const owner_id = ownerId;
      if (owner_id) {
        const ProductsData = await fetchProducts(owner_id);
        setProducts(ProductsData);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const loadCategories = async () => {
    try {
      const CategoriesData = await fetchCategories();
      setCategories(CategoriesData);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadUser = async () => {
    const data = await fetchUser();
    // console.log(data);
    setOwnerId(data.id);
  };

  useEffect(() => {
    loadProducts();
  }, [ownerId]);

  useEffect(() => {
    loadUser();
    loadCategories();
  }, []);

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price.toString());
    formData.append("stock", stock.toString());
    formData.append("description", description);
    formData.append("fairlyUsed", fairlyUsed.toString());
    formData.append("extra_field", JSON.stringify(extraField));
    if (image) formData.append("image", image);
    selectedCategories.forEach((category) => {
      formData.append("categories", category.toString());
    });
    if (requestId) formData.append("request", requestId);
    try {
      await api.post("product/create/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Product added successfully!");
      fetchProducts();
      resetForm();
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Failed to add product.");
    }
  };
  // Reset form fields
  const resetForm = () => {
    setName("");
    setPrice("");
    setImage(null);
    setStock("");
    setSelectedCategories([]);
    setRequestId(null);
    setEditMode(false);
  };

  // Start editing a book
  const startEditProduct = (product: Product) => {
    window.scrollTo(0, 0);
    setCurrentProduct(product);
    setName(product.name);
    setPrice(product.price);
    setImage(null);
    setStock(product.stock);
    setDescription(product.description);
    setFairlyUsed(product.new);
    setSelectedCategories(
      categories.map((cat) => Object.values(Number(cat))).flat()
    );
    setEditMode(true);
  };

  // Update book
  const updateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentProduct) return;

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price.toString());
    if (image) formData.append("image", image);
    formData.append("stock", stock.toString());
    formData.append("new", fairlyUsed.toString());
    formData.append("description", description.toString());
    selectedCategories.forEach((category) => {
      formData.append("category", category.toString());
    });
    try {
      await api.put(`book/update/${currentProduct.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Product updated successfully!");
      fetchProducts();
      resetForm();
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product.");
    }
  };

  // Delete book
  const deleteProduct = async (product: Product) => {
    try {
      await api.delete(`product/delete/${product.id}/`);
      alert("Product deleted successfully!");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product.");
    }
  };

  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB");
      return;
    }
    setImage(file);
    // e.target.value = ""; // Reset input
  };

  const HandleAddOrEditFeature = () => {
    if (cKey && cValue) {
      if (editFeatureMode && oldKey) {
        delete extraField[oldKey];
        extraField[cKey] = cValue;
      } else {
        console.log("Here");
        setExtraField((prev) => ({
          ...prev,
          [cKey]: cValue,
        }));
      }
    }
    setCkey("");
    setCvalue("");
    setOldKey("");
    setEditFeatureMode(false);
  };

  const EditFeature = (key: string | null, value: string | null) => {
    setEditFeatureMode(true);
    setCkey(key);
    setCvalue(value);
    setOldKey(key);
  };

  useEffect(() => {
    console.log(extraField);
  }, [extraField]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  if (error) return <div>{error}</div>;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-10 bg-[#f8f9fa] min-h-screen">
      <h1 className="text-2xl font-bold mb-6">
        {editMode ? "Edit Book" : "Add a Book"}
      </h1>

      <form
        onSubmit={editMode ? updateProduct : createProduct}
        className="space-y-4 bg-white p-6 rounded-lg shadow"
      >
        <input
          type="text"
          placeholder="Name of Product"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-2 border rounded"
        />
        <input
          type="number"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          required
          className="w-full px-4 py-2 border rounded"
        />
        <input
          type="number"
          placeholder="Available quantity"
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
          className="w-full px-4 py-2 border rounded"
        />

        <label className="flex items-center space-x-2">
          <span>Fairly Used</span>
          <input
            type="checkbox"
            checked={fairlyUsed}
            onChange={(e) => setFairlyUsed(e.target.checked)}
            required
          />
        </label>

        <select
          multiple
          value={selectedCategories.map(String)}
          onChange={(e) =>
            setSelectedCategories(
              Array.from(e.target.selectedOptions).map((opt) =>
                Number(opt.value)
              )
            )
          }
          className="w-full p-2 border rounded"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {/* Features Table */}
        <div>
          <table className="w-full text-left border mt-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Feature</th>
                <th className="p-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(extraField).map(([key, value]) => (
                <tr
                  key={key}
                  className="border-t cursor-pointer"
                  onClick={() => EditFeature(key, value)}
                >
                  <td className="p-2">{key}</td>
                  <td className="p-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <input
              placeholder="Feature"
              type="text"
              value={cKey ?? ""}
              onChange={(e) => setCkey(e.target.value)}
              className="flex-1 px-4 py-2 border rounded"
            />
            <input
              placeholder="Value"
              type="text"
              value={cValue ?? ""}
              onChange={(e) => setCvalue(e.target.value)}
              className="flex-1 px-4 py-2 border rounded"
            />
            <button
              type="button"
              onClick={HandleAddOrEditFeature}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {editFeatureMode ? "Update Feature" : "Add Feature"}
            </button>
            {editFeatureMode && (
              <button
                type="button"
                onClick={() => setExtraField({})}
                className="text-sm text-red-600"
              >
                Clear Features
              </button>
            )}
          </div>
        </div>

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-4 border rounded"
        />

        <input
          type="file"
          accept="image/*"
          required={!editMode}
          onChange={handleImageChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {image && (
          <div className="mt-4">
            <Image
              alt="Book Preview"
              src={URL.createObjectURL(image)}
              width={100}
              height={100}
              className="rounded object-contain max-w-[150px]"
            />
          </div>
        )}

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
        >
          {editMode ? "Update Product" : "Add Product"}
        </button>
      </form>

      <h1 className="text-2xl font-semibold mt-12 mb-6">My Products</h1>
      <div className="space-y-6">
        {!products.length ? (
          <p>No products available.</p>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-white p-4 rounded shadow space-y-2"
            >
              <div className="flex justify-center">
                <Product product={product} />
              </div>
              <div className="flex justify-center">
                <table className="w-[full] text-left border mt-2">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2">Key</th>
                      <th className="p-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(product.extra_field).map(([key, value]) => (
                      <tr key={key} className="border-t">
                        <td className="p-2">{key}</td>
                        <td className="p-2">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 mt-2 justify-center">
                <button
                  onClick={() => startEditProduct(product)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteProduct(product)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyProducts;
