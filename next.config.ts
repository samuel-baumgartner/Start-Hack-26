import type { NextConfig } from "next";

/**
 * Dev-only: proxy `/api/*` → FastAPI on localhost. On Vercel, the frontend calls `/_/backend/*`
 * directly (see `lib/api.ts`) so we avoid Next rewrites to `/_/backend`, which hit Deployment
 * Protection (401) on some team projects.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.VERCEL) return [];
    const explicit = process.env.BACKEND_URL?.replace(/\/$/, "");
    const backend = explicit ?? "http://localhost:8000";
    return [
      { source: "/api/sim/:path*", destination: `${backend}/sim/:path*` },
      { source: "/api/agent/:path*", destination: `${backend}/agent/:path*` },
      { source: "/api/events/:path*", destination: `${backend}/events/:path*` },
      {
        source: "/api/auto-tick/:path*",
        destination: `${backend}/auto-tick/:path*`,
      },
      { source: "/api/motor/:path*", destination: `${backend}/motor/:path*` },
    ];
  },
};

export default nextConfig;
