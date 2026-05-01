import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // remotePatterns is the modern replacement for 'domains'
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**", // Matches all Cloudinary paths
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
      {
        protocol: "https", // or 'http' depending on your Render setup
        hostname: "jalev1.onrender.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "", // Leave empty for default or specify if needed (e.g. '5000')
        pathname: "/**",
      },
    ],
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      outputModule: false,
    };
    return config;
  },
};

export default nextConfig;
