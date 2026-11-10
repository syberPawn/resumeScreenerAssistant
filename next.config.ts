import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const onVercel = process.env.VERCEL === "1";

// Content Security Policy: the page may only load scripts, styles, images, fonts and data from this site.
// This is the setup the Next.js documentation recommends for apps without per-request nonces, which keeps
// static pages static. React needs 'unsafe-eval' only in development.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Only on Vercel, where the site is served over HTTPS; local runs use plain http://localhost.
  ...(onVercel ? ["upgrade-insecure-requests"] : []),
].join("; ");

// The app never uses these browser features, so they are switched off for every page.
const permissionsPolicy = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "browsing-topics=()",
].join(", ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Text extraction libraries run as plain Node.js packages on the server instead of being bundled.
  serverExternalPackages: ["unpdf", "mammoth"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Protective headers on every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Permissions-Policy", value: permissionsPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
