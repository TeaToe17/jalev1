import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['127.0.0.1'],
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
