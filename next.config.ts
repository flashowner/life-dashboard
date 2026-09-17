import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  allowedDevOrigins: ["127.0.0.1"],
  // GitHub Pages serves this project under /flashowner/life-dashboard.
  basePath: process.env.GITHUB_ACTIONS === "true" ? "/life-dashboard" : "",
};

export default nextConfig;
