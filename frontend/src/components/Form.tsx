"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../lib/constant";
import LoadingIndicator from "./LoadingIndicator";
import { useAppContext } from "@/context";
import useFcmToken from "./FcmProvider";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

interface FormProps {
  route: string;
  method: "login" | "register";
}

const Form = ({ route, method }: FormProps) => {
  const { url, setIsLoggedIn } = useAppContext();
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [call, setCall] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { token, notificationPermissionStatus } = useFcmToken();

  const name = method === "login" ? "Login" : "Register";
  const isRegister = method === "register";

  // Form validation
  const [formErrors, setFormErrors] = useState({
    username: "",
    password: "",
    email: "",
    whatsapp: "",
    call: "",
  });

  const validateForm = () => {
    let isValid = true;
    const errors = {
      username: "",
      password: "",
      email: "",
      whatsapp: "",
      call: "",
    };

    // Username validation
    if (!username.trim()) {
      errors.username = "Username is required";
      isValid = false;
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
      isValid = false;
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // Additional validations for registration
    if (isRegister) {
      // Email validation
      if (!email) {
        errors.email = "Email is required";
        isValid = false;
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        errors.email = "Email is invalid";
        isValid = false;
      }

      // WhatsApp validation
      if (!whatsapp) {
        errors.whatsapp = "WhatsApp number is required";
        isValid = false;
      } else if (!/^\d{10,15}$/.test(whatsapp)) {
        errors.whatsapp = "Please enter a valid phone number";
        isValid = false;
      }

      // Call number validation
      if (!call) {
        errors.call = "Call number is required";
        isValid = false;
      } else if (!/^\d{10,15}$/.test(call)) {
        errors.call = "Please enter a valid phone number";
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(route, {
        username,
        password,
        email,
        whatsapp,
        call,
      });

      if (method === "login") {
        const { access, refresh } = res.data;
        if (!access || !refresh) {
          throw new Error("Tokens missing in response");
        }

        localStorage.setItem(ACCESS_TOKEN, access);
        localStorage.setItem(REFRESH_TOKEN, refresh);
        setIsLoggedIn(true);
        setSuccess("Login successful! Redirecting...");

        const fcmToken = await token;
        const isIos =
          /iPad|iPhone|iPod/.test(navigator.userAgent) &&
          !("MSStream" in window);

        // try {
        //   if (isIos) {
        //     api.post("user/create_permission_token/", {
        //       subscription: fcmToken,
        //     });
        //   } else {
        //     api.post("user/create_permission_token/", {
        //       token: JSON.stringify(fcmToken),
        //     });
        //   }
        // } catch (error) {
        //   console.log(error);
        // }

        // Short delay for success message to be visible
        setTimeout(() => {
          router.push(url ? `${url}` : "/");
        }, 1000);
      } else {
        setSuccess("Registration successful! Redirecting to login...");

        // Short delay for success message to be visible
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch (error: any) {
      // console.error("Form submission error:", error)

      // Handle specific error cases
      if (error.response) {
        console.log(error);
        const status = error.response.status;
        const data = error.response.data;

        if (status === 400) {
          // Handle validation errors
          if (data.username) {
            setError(`Username error: ${data.username[0]}`);
          } else if (data.password) {
            setError(`Password error: ${data.password[0]}`);
          } else if (data.email) {
            setError(`Email error: ${data.email[0]}`);
          } else if (data.non_field_errors) {
            // This often contains "incorrect username/password" messages
            setError(data.non_field_errors[0]);
          } else if (data.detail) {
            setError(data.detail);
          } else {
            setError("Please check your form inputs and try again.");
          }
        } else if (status === 401) {
          setError("Incorrect username or password. Please try again.");
        } else if (
          status === 409 ||
          (data && data.username && data.username[0].includes("already exists"))
        ) {
          setError(
            "This username is already taken. Please choose another one."
          );
        } else {
          setError("An error occurred. Please try again later.");
        }
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a]/10 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-[#1c2b3a] mb-6 text-center">
            {method === "login" ? "Welcome Back" : "Create Account"}
          </h2>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
              >
                <AlertCircle size={18} />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2"
              >
                <CheckCircle size={18} />
                <p className="text-sm">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUserName(e.target.value);
                  if (formErrors.username) {
                    setFormErrors({ ...formErrors, username: "" });
                  }
                }}
                placeholder="Enter your username"
                className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] transition-colors ${
                  formErrors.username ? "border-red-500" : "border-gray-300"
                }`}
              />
              {formErrors.username && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.username}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.password) {
                      setFormErrors({ ...formErrors, password: "" });
                    }
                  }}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] transition-colors ${
                    formErrors.password ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.password}
                </p>
              )}
            </div>

            {isRegister && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email ?? ""}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) {
                        setFormErrors({ ...formErrors, email: "" });
                      }
                    }}
                    placeholder="Enter your email"
                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] transition-colors ${
                      formErrors.email ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="whatsapp"
                    className="block text-sm font-medium text-gray-700"
                  >
                    WhatsApp Number
                  </label>
                  <input
                    id="whatsapp"
                    type="tel"
                    value={whatsapp ?? ""}
                    onChange={(e) => {
                      setWhatsapp(e.target.value);
                      if (formErrors.whatsapp) {
                        setFormErrors({ ...formErrors, whatsapp: "" });
                      }
                    }}
                    placeholder="Enter your WhatsApp number"
                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] transition-colors ${
                      formErrors.whatsapp ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {formErrors.whatsapp && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.whatsapp}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="call"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Call Number
                  </label>
                  <input
                    id="call"
                    type="tel"
                    value={call ?? ""}
                    onChange={(e) => {
                      setCall(e.target.value);
                      if (formErrors.call) {
                        setFormErrors({ ...formErrors, call: "" });
                      }
                    }}
                    placeholder="Enter your call number"
                    className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] transition-colors ${
                      formErrors.call ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {formErrors.call && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.call}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingIndicator />
              ) : (
                <>
                  {name}
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm">
            {method === "login" ? (
              <>
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <a
                    href="/register"
                    className="text-[#1c2b3a] font-medium hover:underline"
                  >
                    Register here
                  </a>
                </p>
                <p>
                  <a href="/forgotpassword">Forgot Password?</a>
                </p>
              </>
            ) : (
              <p className="text-gray-600">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="text-[#1c2b3a] font-medium hover:underline"
                >
                  Login here
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Form;
