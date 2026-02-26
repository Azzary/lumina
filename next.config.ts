import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/metadata/:path*",
        destination: "http://127.0.0.1:8081/:path*",
      },
      {
        source: "/download/:path*",
        destination: "http://127.0.0.1:8585/:path*",
      },
    ];
  },
};

export default nextConfig;
