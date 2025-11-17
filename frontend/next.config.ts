/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  images: {
    domains: [
      "jalev1.onrender.com",
      "127.0.0.1",
      "res.cloudinary.com",
      "ik.imagekit.io",
    ],
  },

  experimental: {
    turbo: true, // ⚡ enable turbopack builds
  },
};

export default nextConfig;
