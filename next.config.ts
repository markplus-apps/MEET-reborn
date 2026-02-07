import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
