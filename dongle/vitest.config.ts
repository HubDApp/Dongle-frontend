import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Vitest configuration for test runner
// Requires native Rolldown bindings installed via pnpm
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        ".next/",
        "**/*.stories.tsx",
        "**/*.mdx",
        "**/__tests__/**",
        "**/vitest.*.ts",
        "**/next.config.ts",
      ],
      include: ["lib/**/*.ts", "hooks/**/*.ts"],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/*.stories.tsx",
      "**/*.mdx",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
