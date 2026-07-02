import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["bullmq", "ioredis"],
  experimental: {
    optimizePackageImports: ["lucide-react", "@cornerstonejs/core", "@cornerstonejs/tools", "@cornerstonejs/dicom-image-loader"],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // unsafe-eval required by Next.js webpack HMR in dev; cornerstone WASM uses wasm-unsafe-eval
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: 'wasm-unsafe-eval' https://apis.google.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "connect-src 'self' https: blob: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
            "font-src 'self' data:",
            "frame-src 'none' https://accounts.google.com https://corevita-cd882.firebaseapp.com",
            "object-src 'none'",
            "base-uri 'self'",
          ].join("; "),
        },
      ],
    },
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGIN || process.env.NEXTAUTH_URL || "http://localhost:3000" },
        { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Api-Key" },
        { key: "Access-Control-Max-Age", value: "86400" },
      ],
    },
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
      generator: {
        filename: "static/wasm/[name]-[contenthash][ext]",
      },
    });
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
