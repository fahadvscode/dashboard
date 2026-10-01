import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis pulls many optional sub-APIs; bundling with Turbopack fails on missing stubs.
  serverExternalPackages: ["googleapis"],
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/mcp/oauth/protected-resource" },
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/mcp/oauth/protected-resource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/mcp/oauth/authorization-server" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/mcp/oauth/authorization-server" },
      { source: "/.well-known/openid-configuration", destination: "/api/mcp/oauth/authorization-server" },
    ]
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
