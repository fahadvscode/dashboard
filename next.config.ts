import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis pulls many optional sub-APIs; bundling with Turbopack fails on missing stubs.
  serverExternalPackages: ["googleapis"],
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/fub/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.followupboss.com https://followupboss.com",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
