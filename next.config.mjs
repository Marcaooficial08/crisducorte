/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["date-fns-tz"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
  },
};

export default nextConfig;