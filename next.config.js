/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // серверный бандл, НЕ 'export'
  output: 'standalone',
};
module.exports = nextConfig;
