declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PWAOptions = {
    dest: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
  };

  type WithPWA = (config: NextConfig) => NextConfig;

  export default function nextPWA(options: PWAOptions): WithPWA;
}
