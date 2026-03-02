import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const isDev = process.env.NODE_ENV === "development";
const withPWA = nextPWA({
  dest: "public",
  disable: isDev,
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
