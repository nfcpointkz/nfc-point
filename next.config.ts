import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default config;
