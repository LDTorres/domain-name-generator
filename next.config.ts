import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: false,
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
