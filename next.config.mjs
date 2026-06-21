/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://buzzme-5d7a7.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
