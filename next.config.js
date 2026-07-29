/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Output configuration for production deployment.
  // VPS/self-host build uses 'standalone' (small Docker/PM2 bundle). Vercel sets
  // VERCEL=1 and manages its own output — 'standalone' there is unsupported, so
  // fall back to the default only on Vercel.
  output: process.env.VERCEL ? undefined : 'standalone',

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.meesho.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.meesho.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'logos-world.net',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'etimg.etb2bimg.com',
      },
    ],
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security and performance headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // CORS is intentionally NOT set globally — the site is same-origin only.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js runtime needs inline/eval; payment SDKs load their own scripts.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.razorpay.com https://*.cashfree.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              // Cloudinary + other remote image hosts (see images.remotePatterns).
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://res.cloudinary.com https://*.razorpay.com https://*.cashfree.com",
              // Payment gateways render in iframes; the contact page embeds a
              // Google Maps location frame.
              "frame-src 'self' https://*.razorpay.com https://*.cashfree.com https://www.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
