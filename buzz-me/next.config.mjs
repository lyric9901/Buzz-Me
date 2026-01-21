/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Try this if images are broken in production/export
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
