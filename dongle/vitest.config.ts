import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Mirrors tsconfig.json `paths` remaps so Vite/Vitest resolve `@/lib/logger`
 * (and similar) to `utils/*.util.ts` the same way Next.js does.
 */
const TSCONFIG_REMAPS: Record<string, string> = {
  "@/lib/admin-auth": "./utils/admin-auth.util.ts",
  "@/lib/contract-validator": "./utils/contract-validator.util.ts",
  "@/lib/date": "./utils/date.util.ts",
  "@/lib/error-mapper": "./utils/error-mapper.util.ts",
  "@/lib/externalLinkWarning": "./utils/external-link-warning.util.ts",
  "@/lib/id-generator": "./utils/id-generator.util.ts",
  "@/lib/logger": "./utils/logger.util.ts",
  "@/lib/network-guard": "./utils/network-guard.util.ts",
  "@/lib/prefetch-config": "./utils/prefetch-config.util.ts",
  "@/lib/project-cache": "./utils/project-cache.util.ts",
  "@/lib/project-id": "./utils/project-id.util.ts",
  "@/lib/repository": "./utils/repository.util.ts",
  "@/lib/stellar-address": "./utils/stellar-address.util.ts",
  "@/lib/submission-quality": "./utils/submission-quality.util.ts",
  "@/lib/transaction-progress": "./utils/transaction-progress.util.ts",
  "@/lib/url": "./utils/url.util.ts",
  "@/lib/utils": "./utils/utils.util.ts",
  "@/services/data-access/migration": "./services/data-access/migration.service.ts",
  "@/services/data-access/MockUpdateRepository": "./services/data-access/MockUpdateRepository.service.ts",
  "@/services/data-access/IUpdateRepository": "./services/data-access/IUpdateRepository.service.ts",
  "@/services/data-access/IProjectRepository": "./services/data-access/IProjectRepository.service.ts",
  "@/services/data-access/MockReviewRepository": "./services/data-access/MockReviewRepository.service.ts",
  "@/services/data-access/registry": "./services/data-access/registry.service.ts",
  "@/services/data-access/IReviewRepository": "./services/data-access/IReviewRepository.service.ts",
  "@/services/data-access/MockProjectRepository": "./services/data-access/MockProjectRepository.service.ts",
  "@/services/project/batch-fetch": "./services/project/batch-fetch.service.ts",
  "@/services/stellar/batch-verification": "./services/stellar/batch-verification.service.ts",
};

// Vitest configuration for test runner
// Requires native Rolldown bindings installed via pnpm
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: [
      ...Object.entries(TSCONFIG_REMAPS).map(([find, rel]) => ({
        find,
        replacement: path.resolve(rootDir, rel),
      })),
      { find: "@", replacement: path.resolve(rootDir, "./") },
    ],
  },
});
