/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate mount issues during complex canvas drag operations
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'exceljs'],
  },
};

module.exports = nextConfig;
