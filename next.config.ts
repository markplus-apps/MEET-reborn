import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["https://*.replit.dev", "https://*.repl.co"],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
