import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rentora/ui"],
  experimental: {
    optimizePackageImports: ["@rentora/ui"],
  },
};

export default nextConfig;
