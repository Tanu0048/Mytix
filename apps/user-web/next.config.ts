import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Local backend image hosts are only allowed in development. In production the image
// optimizer must never be able to fetch from localhost/private IPs.
const devImageHosts = isDev
  ? [
      { protocol: "http" as const, hostname: "localhost", port: "5000" },
      { protocol: "http" as const, hostname: "127.0.0.1", port: "5000" },
    ]
  : [];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...devImageHosts,
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
    ],
    dangerouslyAllowLocalIP: isDev,
  },
};

export default nextConfig;
