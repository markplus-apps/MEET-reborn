import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.replit.dev",
    "*.janeway.replit.dev",
    "*.replit.app",
  ],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
