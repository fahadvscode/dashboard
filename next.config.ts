import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis pulls many optional sub-APIs; bundling with Turbopack fails on missing stubs.
  serverExternalPackages: ["googleapis"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
