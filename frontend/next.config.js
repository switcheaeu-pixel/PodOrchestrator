/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  // Remove standalone output for Vercel compatibility
  // output: 'standalone', // Commented out for Vercel
}

module.exports = nextConfig