import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "jalev1.onrender.com",
      "127.0.0.1",
      "res.cloudinary.com",
      "ik.imagekit.io",
    ],
  },
  webpack: (config) => {
    // Avoid forcing output module for compatibility
    config.experiments = {
      ...config.experiments,
      outputModule: false,
    };
    return config;
  },
};

export default nextConfig;
