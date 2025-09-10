import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    alias: {
      "next-auth/adapters": path.resolve(
        __dirname,
        "./src/test/mocks/next-auth-adapters.ts",
      ),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "*.config.*",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "src/env.js",
        "**/*.test.*",
        "**/types/**",
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
        perFile: true,
      },
      include: [
        "src/server/auth.ts",
        "src/server/api/routers/auth.ts",
        "src/server/api/trpc.ts",
        "src/app/**/*auth*.tsx",
        "src/components/**/*auth*.tsx",
        "src/lib/**/*auth*.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
