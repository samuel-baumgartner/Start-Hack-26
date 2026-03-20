import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/sim/:path*",
        destination: "http://localhost:8000/sim/:path*",
      },
      {
        source: "/api/agent/:path*",
        destination: "http://localhost:8000/agent/:path*",
      },
      {
        source: "/api/events/:path*",
        destination: "http://localhost:8000/events/:path*",
      },
      {
        source: "/api/auto-tick/:path*",
        destination: "http://localhost:8000/auto-tick/:path*",
      },
      {
        source: "/api/motor/:path*",
        destination: "http://localhost:8000/motor/:path*",
      },
    ];
  },
};

export default nextConfig;
