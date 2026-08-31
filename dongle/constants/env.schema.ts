/**
 * Environment Variable Schema and Validation
 * 
 * This module provides comprehensive Zod schemas for all environment variables
 * used in the Dongle application, including:
 * - Type validation
 * - Default values
 * - Validation rules
 * - Documentation
 * - JSON Schema export for external tools
 * 
 * @see dongle/.env.example for setup instructions
 * @see dongle/DEPLOYMENT.md for production checklist
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates a Stellar contract ID: starts with "C" followed by exactly 55
 * base-32 characters (A-Z, 2-7). Total length: 56 chars.
 * 
 * @example "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
 */
export const ContractIdSchema = z
  .string()
  .regex(/^C[A-Z2-7]{55}$/, "Must be a 56-character Stellar contract ID starting with 'C'")
  .describe("Stellar Soroban contract ID (56 characters: C + 55 base32)");

/**
 * Validates a Stellar public key (G-address): starts with "G" followed by 
 * exactly 55 base-32 characters (A-Z, 2-7). Total length: 56 chars.
 * 
 * @example "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"
 */
export const PublicKeySchema = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, "Must be a 56-character Stellar public key starting with 'G'")
  .describe("Stellar public key (G-address, 56 characters)");

/**
 * Validates a comma-separated list of Stellar public keys
 * 
 * @example "GBRPY...,GCEZW...,GDNYO..."
 */
export const PublicKeyListSchema = z
  .string()
  .optional()
  .transform((val) => (val ? val.split(",").map((k) => k.trim()) : []))
  .pipe(z.array(PublicKeySchema))
  .describe("Comma-separated list of Stellar public keys");

/**
 * Development placeholder contract ID (all A's). Structurally valid but
 * will fail any real on-chain call. Only permitted in development/test.
 */
export const DEV_CONTRACT_PLACEHOLDER =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/**
 * Production contract ID: must be a valid contract ID that is NOT the
 * development placeholder.
 */
export const ProductionContractIdSchema = ContractIdSchema.refine(
  (id) => id !== DEV_CONTRACT_PLACEHOLDER,
  {
    message:
      "Development placeholder contract ID not allowed in production. " +
      "Deploy contracts and set real contract IDs.",
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// SOROBAN CONTRACT ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Soroban smart contract addresses for the Dongle protocol
 */
export const SorobanContractEnvSchema = z.object({
  /**
   * Project Registry Contract ID
   * 
   * Stores registered dApp listings with metadata (name, category, description,
   * website URL, GitHub URL, logo, documentation).
   * 
   * @required In production
   * @default "CAAAA..." (dev placeholder) in development
   * @example "CBGTB...XYZ"
   */
  NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: z
    .string()
    .describe("Project Registry smart contract ID"),

  /**
   * Review Registry Contract ID
   * 
   * Stores on-chain review ratings and IPFS references to full review text.
   * Enables reputation scores and review aggregation.
   * 
   * @required In production
   * @default "CAAAA..." (dev placeholder) in development
   * @example "CCDEF...ABC"
   */
  NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: z
    .string()
    .describe("Review Registry smart contract ID"),

  /**
   * Verification Registry Contract ID
   * 
   * Manages verification requests, approval status, and rejection reasons.
   * Used for the Dongle verification badge system.
   * 
   * @required In production
   * @default "CAAAA..." (dev placeholder) in development
   * @example "CGHIJ...DEF"
   */
  NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: z
    .string()
    .describe("Verification Registry smart contract ID"),
});

// ═══════════════════════════════════════════════════════════════════════════
// STELLAR NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Stellar network configuration
 */
export const StellarNetworkEnvSchema = z.object({
  /**
   * Soroban RPC Endpoint URL
   * 
   * The Stellar RPC endpoint used for blockchain interactions. Must be an
   * HTTPS URL with accessible RPC endpoint.
   * 
   * Common values:
   * - Testnet: https://soroban-testnet.stellar.org:443
   * - Mainnet: https://mainnet.stellar.validationcloud.io (or custom provider)
   * 
   * @required In production
   * @default "https://soroban-testnet.stellar.org:443" in development
   * @example "https://soroban-testnet.stellar.org:443"
   */
  NEXT_PUBLIC_SOROBAN_RPC_URL: z
    .string()
    .url("Must be a valid HTTPS URL")
    .describe("Soroban RPC endpoint URL"),

  /**
   * Stellar Network Passphrase
   * 
   * Identifies the Stellar network for transaction signing. Must match the
   * network selection in the user's Freighter wallet.
   * 
   * Standard values:
   * - Testnet: "Test SDF Network ; September 2015"
   * - Mainnet: "Public Global Stellar Network ; September 2015"
   * 
   * @required In production
   * @default "Test SDF Network ; September 2015" in development
   * @example "Test SDF Network ; September 2015"
   */
  NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: z
    .string()
    .min(1, "Network passphrase must not be empty")
    .describe("Stellar network passphrase for transaction signing"),
});

// ═══════════════════════════════════════════════════════════════════════════
// REVIEW PERSISTENCE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Review persistence mode configuration
 */
export const ReviewPersistenceEnvSchema = z.object({
  /**
   * Review Persistence Mode
   * 
   * Controls where reviews are stored during development and testing.
   * 
   * Values:
   * - "api": Use server-side API routes (in-memory Map storage)
   * - (empty or any other): Use client-side localStorage (dev-only)
   * 
   * WARNING: Both modes are development-only. In production, reviews will be
   * stored on-chain via the Review Registry contract.
   * 
   * @optional
   * @default localStorage (empty string)
   * @example "api"
   */
  NEXT_PUBLIC_REVIEW_PERSISTENCE: z
    .string()
    .optional()
    .describe("Review storage mode: 'api' for server storage, empty for localStorage"),
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ACCESS CONTROL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Admin authentication and authorization configuration
 */
export const AdminEnvSchema = z.object({
  /**
   * Admin Allowlist (Client-Side)
   * 
   * Comma-separated list of Stellar public keys (G-addresses) allowed to
   * access admin features in the UI. This is exposed in the client bundle
   * and should be considered public information.
   * 
   * Leave empty to disable admin-only routes entirely.
   * 
   * @optional
   * @default "" (no admins)
   * @example "GBRPY...,GCEZW..."
   */
  NEXT_PUBLIC_ADMIN_ALLOWLIST: z
    .string()
    .optional()
    .default("")
    .describe("Comma-separated Stellar public keys for client-side admin UI access"),

  /**
   * Admin Allowlist (Server-Side)
   * 
   * Source of truth for admin authentication on the server. NOT exposed to
   * the client bundle. Used to verify admin JWT tokens and authorize
   * admin-only API operations.
   * 
   * Must match or be a superset of NEXT_PUBLIC_ADMIN_ALLOWLIST.
   * 
   * @optional Server-side only
   * @default "" (no admins)
   * @example "GBRPY...,GCEZW...,GDNYO..."
   */
  ADMIN_ALLOWLIST: z
    .string()
    .optional()
    .default("")
    .describe("Server-side admin allowlist (not exposed to client)"),

  /**
   * Admin JWT Secret
   * 
   * Secret key for signing and verifying admin authentication JWT tokens.
   * Must be cryptographically secure and kept secret.
   * 
   * Generate with: `openssl rand -hex 32`
   * 
   * @required If admin features are enabled
   * @optional If admin features are disabled
   * @default "" (admin auth disabled)
   * @example "a1b2c3d4e5f6...64-character-hex"
   */
  ADMIN_JWT_SECRET: z
    .string()
    .optional()
    .default("")
    .describe("Secret key for signing admin JWT tokens (server-side only)"),
});

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Product analytics configuration
 */
export const AnalyticsEnvSchema = z.object({
  /**
   * Analytics Enabled Flag
   * 
   * Controls whether privacy-conscious client-side analytics events are
   * emitted. When disabled, no analytics events are sent.
   * 
   * Set to "false" to completely disable analytics.
   * 
   * @optional
   * @default "true" in production, console.debug logging in development
   * @example "true" | "false"
   */
  NEXT_PUBLIC_ANALYTICS_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val !== "false")
    .describe("Enable/disable analytics event emission"),

  /**
   * Analytics Ingest URL
   * 
   * HTTPS endpoint that accepts POST requests with JSON analytics event
   * payloads. When unset, events are only logged via console.debug in
   * development.
   * 
   * See ANALYTICS_TRACKING_PLAN.md for event schema.
   * 
   * @optional
   * @default "" (console logging only)
   * @example "https://analytics.dongle.app/ingest"
   */
  NEXT_PUBLIC_ANALYTICS_INGEST_URL: z
    .string()
    .url("Must be a valid HTTPS URL")
    .optional()
    .or(z.literal(""))
    .describe("Analytics ingest endpoint URL"),
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE ENVIRONMENT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete environment variable schema for the Dongle application.
 * 
 * Combines all sub-schemas into a single comprehensive schema.
 */
export const CompleteEnvSchema = SorobanContractEnvSchema.merge(StellarNetworkEnvSchema)
  .merge(ReviewPersistenceEnvSchema)
  .merge(AdminEnvSchema)
  .merge(AnalyticsEnvSchema);

/**
 * Type inference for validated environment variables
 */
export type EnvConfig = z.infer<typeof CompleteEnvSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT-SPECIFIC SCHEMAS (DEV vs PRODUCTION)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Development environment schema with lenient defaults
 * 
 * - Contract IDs default to placeholder
 * - RPC URL defaults to testnet
 * - Network passphrase defaults to testnet
 * - All optional fields work without configuration
 */
export const DevelopmentEnvSchema = z.object({
  NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: ContractIdSchema.default(DEV_CONTRACT_PLACEHOLDER),
  NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: ContractIdSchema.default(DEV_CONTRACT_PLACEHOLDER),
  NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: ContractIdSchema.default(DEV_CONTRACT_PLACEHOLDER),
  NEXT_PUBLIC_SOROBAN_RPC_URL: z
    .string()
    .url()
    .default("https://soroban-testnet.stellar.org:443"),
  NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: z
    .string()
    .default("Test SDF Network ; September 2015"),
  NEXT_PUBLIC_REVIEW_PERSISTENCE: z.string().optional().default(""),
  NEXT_PUBLIC_ADMIN_ALLOWLIST: z.string().optional().default(""),
  ADMIN_ALLOWLIST: z.string().optional().default(""),
  ADMIN_JWT_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val !== "false"),
  NEXT_PUBLIC_ANALYTICS_INGEST_URL: z.string().optional().default(""),
});

/**
 * Production environment schema with strict validation
 * 
 * - Contract IDs REQUIRED and must NOT be placeholder
 * - RPC URL REQUIRED
 * - Network passphrase REQUIRED
 * - Admin JWT secret REQUIRED if admin allowlist is set
 */
export const ProductionEnvSchema = z.object({
  NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: ProductionContractIdSchema,
  NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: ProductionContractIdSchema,
  NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: ProductionContractIdSchema,
  NEXT_PUBLIC_SOROBAN_RPC_URL: z.string().url("RPC URL must be a valid HTTPS endpoint"),
  NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: z
    .string()
    .min(1, "Network passphrase is required in production"),
  NEXT_PUBLIC_REVIEW_PERSISTENCE: z.string().optional().default(""),
  NEXT_PUBLIC_ADMIN_ALLOWLIST: z.string().optional().default(""),
  ADMIN_ALLOWLIST: z.string().optional().default(""),
  ADMIN_JWT_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val !== "false"),
  NEXT_PUBLIC_ANALYTICS_INGEST_URL: z.string().optional().default(""),
}).refine(
  (data) => {
    // If admin allowlist is set, JWT secret must be provided
    const hasAdmins =
      data.ADMIN_ALLOWLIST && data.ADMIN_ALLOWLIST.trim().length > 0;
    const hasSecret =
      data.ADMIN_JWT_SECRET && data.ADMIN_JWT_SECRET.trim().length > 0;
    return !hasAdmins || hasSecret;
  },
  {
    message:
      "ADMIN_JWT_SECRET is required when ADMIN_ALLOWLIST is set. " +
      "Generate with: openssl rand -hex 32",
    path: ["ADMIN_JWT_SECRET"],
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates environment variables with detailed error reporting
 * 
 * @param env - Raw environment variables (typically process.env)
 * @param isDev - True for development/test, false for production
 * @returns Validated and typed environment configuration
 * @throws {Error} With detailed validation errors if validation fails
 */
export function validateEnv(
  env: Record<string, string | undefined>,
  isDev: boolean,
): EnvConfig {
  const schema = isDev ? DevelopmentEnvSchema : ProductionEnvSchema;
  const result = schema.safeParse(env);

  if (result.success) {
    return result.data;
  }

  // Format errors for human-readable output
  const errorLines = result.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
  );

  const errorMessage = [
    "",
    "╔══════════════════════════════════════════════════════════════╗",
    "║          ENVIRONMENT CONFIGURATION ERROR                     ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `Environment: ${isDev ? "DEVELOPMENT" : "PRODUCTION"}`,
    "",
    "The following environment variables are invalid:",
    ...errorLines,
    "",
    isDev
      ? "In development, most variables have safe defaults."
      : "In production, ALL required variables must be explicitly set.",
    "",
    "See:",
    "  - dongle/.env.example for configuration template",
    "  - dongle/DEPLOYMENT.md for production checklist",
    "  - dongle/constants/env.schema.ts for schema reference",
    "",
  ].join("\n");

  console.error(errorMessage);

  throw new Error(
    `Environment validation failed with ${result.error.issues.length} error(s). ` +
      "See console output for details.",
  );
}

/**
 * Checks if configured contracts are still using development placeholders
 * 
 * @param contracts - Contract ID configuration object
 * @returns True if any contract is using the placeholder ID
 */
export function hasPlaceholderContracts(contracts: {
  PROJECT_REGISTRY: string;
  REVIEW_REGISTRY: string;
  VERIFICATION_REGISTRY: string;
}): boolean {
  return (
    contracts.PROJECT_REGISTRY === DEV_CONTRACT_PLACEHOLDER ||
    contracts.REVIEW_REGISTRY === DEV_CONTRACT_PLACEHOLDER ||
    contracts.VERIFICATION_REGISTRY === DEV_CONTRACT_PLACEHOLDER
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON SCHEMA EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Exports environment schema as JSON Schema for external tools
 * 
 * Useful for:
 * - IDE autocomplete in .env files
 * - Documentation generation
 * - CI/CD validation
 * - Integration with config management tools
 * 
 * @returns JSON Schema representation of the environment variables
 */
export function exportJsonSchema() {
  return zodToJsonSchema(CompleteEnvSchema, {
    name: "DongleEnvironmentVariables",
    $refStrategy: "none",
  });
}

/**
 * Generates a TypeScript interface definition from the schema
 * 
 * Useful for type-safe environment access in other languages or tools.
 * 
 * @returns TypeScript interface as a string
 */
export function exportTypeScriptInterface(): string {
  return `
/**
 * Environment variable configuration for Dongle application
 * Generated from env.schema.ts
 */
export interface DongleEnvironmentVariables {
  // Soroban Contract Addresses
  NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: string;
  NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: string;
  NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: string;

  // Stellar Network Configuration
  NEXT_PUBLIC_SOROBAN_RPC_URL: string;
  NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: string;

  // Review Persistence (Development)
  NEXT_PUBLIC_REVIEW_PERSISTENCE?: string;

  // Admin Access Control
  NEXT_PUBLIC_ADMIN_ALLOWLIST?: string;
  ADMIN_ALLOWLIST?: string;
  ADMIN_JWT_SECRET?: string;

  // Analytics
  NEXT_PUBLIC_ANALYTICS_ENABLED?: boolean;
  NEXT_PUBLIC_ANALYTICS_INGEST_URL?: string;
}
`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  DEV_CONTRACT_PLACEHOLDER,
  type EnvConfig,
};
