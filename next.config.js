/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  typescript: {
    // Allow build to succeed even if type errors exist (pre-commit compile-only)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow build to succeed even if linting errors exist (pre-commit lint-only)
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Enable experimental features for better performance
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  // Enable static optimization where possible
  output: "standalone",
};

export default config;
