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
  // Kreves av Docker-imaget: samler server + kun nødvendige node_modules i
  // .next/standalone, slik at runner-steget slipper hele avhengighetstreet.
  output: "standalone",
};

export default withPWA(nextConfig);
