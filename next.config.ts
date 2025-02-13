import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Permissions-Policy",
    value: "clipboard-write=(self)",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  productionBrowserSourceMaps: true, // Enables source maps for production

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
    ],
  },
};

export default nextConfig;
