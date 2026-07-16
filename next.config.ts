import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks `*` globally, so we allow any ngrok domain explicitly:
  allowedDevOrigins: [
    "localhost:3000",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.io",
    "*",
  ],
};
export default nextConfig;
