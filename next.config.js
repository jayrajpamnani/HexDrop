/** @type {import('next').NextConfig} */
// Configuration for Next.js deployment
const nextConfig = {
  reactStrictMode: true,
  
  // Skip ESLint during build (CI runs type-check separately)
  eslint: { ignoreDuringBuilds: true },
  
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
