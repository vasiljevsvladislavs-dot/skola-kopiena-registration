/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // ← Важно! серверный билд
};

module.exports = nextConfig;
