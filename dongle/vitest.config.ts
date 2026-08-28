import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

// Vitest configuration for test runner
// Requires native Rolldown bindings installed via pnpm
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/*.stories.tsx",
      "**/*.mdx",
      "**/e2e/**",
    ],
  },
  resolve: {
    alias: {
      "@/lib/admin-auth": path.resolve(__dirname, "./utils/admin-auth.util"),
      "@/lib/contract-validator": path.resolve(__dirname, "./utils/contract-validator.util"),
      "@/lib/date": path.resolve(__dirname, "./utils/date.util"),
      "@/lib/error-mapper": path.resolve(__dirname, "./utils/error-mapper.util"),
      "@/lib/externalLinkWarning": path.resolve(__dirname, "./utils/external-link-warning.util"),
      "@/lib/id-generator": path.resolve(__dirname, "./utils/id-generator.util"),
      "@/lib/logger": path.resolve(__dirname, "./utils/logger.util"),
      "@/lib/network-guard": path.resolve(__dirname, "./utils/network-guard.util"),
      "@/lib/prefetch-config": path.resolve(__dirname, "./utils/prefetch-config.util"),
      "@/lib/project-cache": path.resolve(__dirname, "./utils/project-cache.util"),
      "@/lib/project-id": path.resolve(__dirname, "./utils/project-id.util"),
      "@/lib/repository": path.resolve(__dirname, "./utils/repository.util"),
      "@/lib/stellar-address": path.resolve(__dirname, "./utils/stellar-address.util"),
      "@/lib/submission-quality": path.resolve(__dirname, "./utils/submission-quality.util"),
      "@/lib/transaction-progress": path.resolve(__dirname, "./utils/transaction-progress.util"),
      "@/lib/url": path.resolve(__dirname, "./utils/url.util"),
      "@/lib/utils": path.resolve(__dirname, "./utils/utils.util"),
      "@/services/data-access/migration": path.resolve(__dirname, "./services/data-access/migration.service"),
      "@/services/data-access/MockUpdateRepository": path.resolve(__dirname, "./services/data-access/MockUpdateRepository.service"),
      "@/services/data-access/IUpdateRepository": path.resolve(__dirname, "./services/data-access/IUpdateRepository.service"),
      "@/services/data-access/IProjectRepository": path.resolve(__dirname, "./services/data-access/IProjectRepository.service"),
      "@/services/data-access/MockReviewRepository": path.resolve(__dirname, "./services/data-access/MockReviewRepository.service"),
      "@/services/data-access/registry": path.resolve(__dirname, "./services/data-access/registry.service"),
      "@/services/data-access/IReviewRepository": path.resolve(__dirname, "./services/data-access/IReviewRepository.service"),
      "@/services/data-access/MockProjectRepository": path.resolve(__dirname, "./services/data-access/MockProjectRepository.service"),
      "@/services/project/batch-fetch": path.resolve(__dirname, "./services/project/batch-fetch.service"),
      "@/services/stellar/batch-verification": path.resolve(__dirname, "./services/stellar/batch-verification.service"),
      "@": path.resolve(__dirname, "./"),
    },
  },
});
