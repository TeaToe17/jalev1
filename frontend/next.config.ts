import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    domains: isProd ? ["jalev1.onrender.com"] : ["127.0.0.1"],
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
