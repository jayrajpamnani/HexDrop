/** @type {import('next').NextConfig} */
// Configuration for Next.js deployment
const nextConfig = {
  reactStrictMode: true,
  
  // Enable standalone output for Docker deployment
  // This creates a minimal production build that includes only necessary files
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
