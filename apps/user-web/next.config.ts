import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "in.bmscdn.com",
      },
      {
        protocol: "https",
        hostname: "kfcocpzuzxpinqgnzhsq.supabase.co",
      },
      {
        protocol: "https",
        hostname: "mytix.onrender.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5000",
      },
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
