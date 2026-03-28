import type { NextConfig } from "next";

// Content-Security-Policy: controls which resources the browser is allowed to load
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://i.imgur.com data:;
  font-src 'self';
  connect-src 'self' ws://localhost:* wss://*.keppel.app https://*.keppel.app https://accounts.google.com https://oauth2.googleapis.com https://people.googleapis.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`;

const securityHeaders = [
  {
    // Forces HTTPS for 2 years; prevents SSL-stripping attacks
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Prevents browsers from MIME-sniffing a response away from the declared content-type
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Prevents the site from being embedded in iframes (clickjacking protection)
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Controls how much referrer info is sent with requests
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Enables DNS prefetching for external domains (performance)
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    // Restricts browser API access (camera, mic, geolocation denied; clipboard allowed)
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), clipboard-write=(self)",
  },
  {
    // Master policy controlling all resource loading
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
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
