import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack conflict fix for the PWA wrapper
  webpack: (config) => {
    return config;
  },
};

export default withPWA(nextConfig);
