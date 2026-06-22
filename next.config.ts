import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Enable React Strict Mode — catches double-invocation bugs and deprecation warnings
  reactStrictMode: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Enable gzip/brotli compression
  compress: true,

  typescript: {
    // Keep ignoring build errors for now — enable in a future cleanup sprint
    ignoreBuildErrors: true,
  },

  // Optimize large package imports — tree-shakes icons and animation library
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons'],
  },

  // Image optimization — allow external avatar / thumbnail domains
  images: {
    remotePatterns: [
      // Supabase storage
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Supabase storage (custom domains)
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
      // Generic CDN / avatar services
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    // Modern formats for smaller payloads
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers applied to every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
