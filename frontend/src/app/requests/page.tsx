"use client"

import api from "@/lib/api";
import React, { useEffect, useState } from "react";
import { useRouter,usePathname } from "next/navigation";

import { useAppContext } from "@/context";

import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../lib/constant";

const Requests = () => {
  
  interface Request {
    id: number;
    name: string;
    image: string;
    level: string;
    description: string;
    course: string;
  }
  
  const router = useRouter()
  const pathname = usePathname()
  const {setUrl} = useAppContext()
  
  const [requests, setRequests] = useState<Request[]>([]); // Handle a list of requests
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get("request/list/"); // Ensure API response is awaited
        setRequests(res.data); // Update state with the fetched data
      } catch (err: any) {
        console.error(err);
        // Handle the error response properly
        if (err.response && err.response.data) {
          setError(err.response.data.message || "Failed to fetch requests");
        } else {
          setError("An unexpected error occurred");
        }
      }
    };

    fetchRequests(); // Call the async function
    
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

  const [bookName, setBookName] = useState<string>("");
  const [image, setImage] = useState<any>(null);
  const [level, setLevel] = useState<string>("");
  const [course, setCourse] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [buyerName, setBuyerName] = useState<string>("");
  const [whatsappContact, setWhatsappContact] = useState<string>("");
  const [callContact, setCallContact] = useState<string>("");
  const isLoggedIn = useIsLoggedIn()

  const inputFields = [
    { placeholder: "Name of Book", value: bookName, setValue: setBookName },
    {
      placeholder: "What level is this book for",
      value: level,
      setValue: setLevel,
    },
    { placeholder: "Course", value: course, setValue: setCourse },
    { placeholder: "Your Name", value: buyerName, setValue: setBuyerName },
    {
      placeholder: "Your WhatsApp Contact",
      value: whatsappContact,
      setValue: setWhatsappContact,
    },
    {
      placeholder: "Your Call Contact",
      value: callContact,
      setValue: setCallContact,
    },
  ];

  const CreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", bookName);
    if (image) formData.append("image", image);
    formData.append("level", level);
    formData.append("course", course);
    formData.append("description", description);
    formData.append("buyer_name", buyerName);
    formData.append("buyer_whatsapp_contact", whatsappContact);
    formData.append("buyer_call_contact", callContact);

    try {
      const response = await api.post("request/create/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Request successfully placed!");
      router.push(
        `https://wa.me/2348152207142?text=Hello%20%0AI%20just%20made%20a%20request%20for%20${encodeURIComponent(bookName ?? "")}%20(${level} level)`
      );

      setRequests((prev) => [...prev, response.data]);
      setBookName("");
      setImage(null);
      setLevel("");
      setCourse("");
      setDescription("");
      setBuyerName("");
      setWhatsappContact("");
      setCallContact("");

    } catch (err: any) {
      console.error("Failed to create request:", err);
      setError(err.response?.data?.message || "Failed to create request");
    }
  };


  const CreateProduct = (request: Request) => {
    if (isLoggedIn) {
      router.push(`/mybooks/${request.id}/`);
    } else {
      // router.push(`login/${request.id}`);
      setUrl("mybooks/"+request.id)
      router.push(`login/`);

    }
  };
  


  return (
    <div className="bg-[#f8f9fa] min-h-screen px-4 sm:px-8 md:px-16 lg:px-32 py-10 space-y-8">
      {/* Error message */}
      {error && <p className="text-red-600">{error}</p>}
  
      {/* Request prompt */}
      <p className="text-lg font-medium text-gray-700">
        Didn’t find the book? Place a request below:
      </p>
  
      {/* Create Request Form */}
      <div className="bg-white rounded-lg shadow p-6">
        {isLoggedIn ? (
          <form onSubmit={CreateRequest} className="space-y-4">
            {inputFields.map((field, index) => (
              <input
                key={index}
                type="text"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.setValue(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            ))}
  
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImage(e.target.files[0]);
                } else {
                  setImage(null);
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
  
            {image && (
              <img
                src={URL.createObjectURL(image)}
                alt="Preview"
                className="w-32 h-auto rounded border mt-2"
              />
            )}
  
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow"
            >
              Submit Request
            </button>
          </form>
        ) : (
          <div className="text-center space-y-2">
            <p className="text-gray-700">Login to create a book request</p>
            <button
              onClick={() => {
                setUrl(pathname);
                router.push("/login");
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md shadow"
            >
              Login
            </button>
          </div>
        )}
      </div>
  
      {/* Requested Books List */}
      <div>
        <h1 className="text-2xl font-semibold mb-4">Requested Books</h1>
        {requests.length > 0 ? (
          <ul className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {requests.map((request, index) => (
              <li
                key={index}
                className="bg-white rounded-lg shadow p-4 space-y-2 text-gray-800"
              >
                <h2 className="text-lg font-semibold">{request.name}</h2>
                <img
                  src={request.image}
                  alt={request.name}
                  className="w-full h-auto rounded"
                />
                <p>
                  <strong>Level:</strong> {request.level}
                </p>
                <p>
                  <strong>Course:</strong> {request.course}
                </p>
                <p>{request.description}</p>
                <button
                  onClick={() => CreateProduct(request)}
                  className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  I Have This
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !error && <p className="text-gray-500">Loading requested books...</p>
        )}
      </div>
    </div>
  );  
};

export default Requests;
