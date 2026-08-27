import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { fileNamingPlugin } from "./scripts/eslint-file-naming.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    plugins: {
      naming: fileNamingPlugin,
    },
    rules: {
      "naming/file-naming": "error",
      // Public module areas must be consumed through their root barrel exports.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../components/*/**",
                "../services/*/**",
                "../hooks/*/**",
                "../types/*/**",
                "../lib/*/**",
              ],
              message: "Use the root barrel or '@/...' path alias instead of a deep relative import.",
            },
          ],
        },
      ],
      // Allow underscore-prefixed names as the conventional "intentionally unused" marker.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;

