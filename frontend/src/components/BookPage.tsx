"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // For navigation if needed
import api from "@/lib/api";

interface Params {
  id: number; // Dynamic route parameter
}

interface Book {
  id: number;
  name: string;
  standard_price: string;
  image: string;
  course: string;
}

const BookPage = ({ params }: { params: Params }) => {
  const { id } = params; // Extract the ID from params
  const [bookDetails, setBookDetails] = useState<Book | null>(null);
  
  useEffect(() => {
    console.log(id)
    const fetchBook = async () => {
      try {
        const res = await api.get<Book[]>("book/list/"); // Replace with your actual API endpoint
        if (res && res.data) {
        //   console.log(res)
          const book = res.data.find((b) => b.id === id); // Match book by ID
          setBookDetails(book || null);
        }
      } catch (error) {
        console.error("Error fetching book details:", error);
      }
    };

    fetchBook();
  }, [id]);

  if (!bookDetails) return <div>Loading book details...</div>;

  return (
    <div>
      <h1>{bookDetails.name}</h1>
      <p>Price: {bookDetails.standard_price}</p>
      <p>Course: {bookDetails.course}</p>
      <img src={bookDetails.image} alt={bookDetails.name} />
    </div>
  );
};

export default BookPage;
