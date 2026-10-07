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
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
