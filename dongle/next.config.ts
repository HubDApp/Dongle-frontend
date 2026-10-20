import type { NextConfig } from "next";

// Bundle analyzer setup
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Strict mode catches potential issues early
  reactStrictMode: true,

  // Set workspace root to silence Turbopack lockfile warning
  turbopack: {
    root: __dirname,
  },

  // Compress responses for faster delivery
  compress: true,

  // Allow images from common hosting domains
  images: {
    remotePatterns: [
      // Decentralised storage
      { protocol: "https", hostname: "**.ipfs.io" },
      { protocol: "https", hostname: "**.ipfs.dweb.link" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "cloudflare-ipfs.com" },
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      { protocol: "https", hostname: "gateway.io" },
      { protocol: "https", hostname: "arweave.net" },
      { protocol: "https", hostname: "**.arweave.net" },
      // Code hosting / raw assets
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // CDN / general image hosting used by projects
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "i.imgur.com" },
    ],
  },

  // Security headers (CSP + most headers) are set dynamically in middleware.ts
  // so that a fresh nonce can be embedded in the CSP on every request.
  // Only headers that apply to static assets (served directly by Next.js,
  // bypassing middleware) are kept here.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
