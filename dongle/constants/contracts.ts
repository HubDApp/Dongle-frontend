import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * Validates a Stellar contract ID: starts with "C" followed by exactly 55
 * base-32 characters (A-Z, 2-7).  Total length: 56 chars.
 */
export const ContractIdSchema = z
  .string()
  .regex(/^C[A-Z2-7]{55}$/, "Invalid Stellar Contract ID format");

/**
 * Validates a Stellar public key: starts with "G" followed by exactly 55
 * base-32 characters (A-Z, 2-7).  Total length: 56 chars.
 */
export const PublicKeySchema = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar Public Key format");

// ─── Safe dev defaults ────────────────────────────────────────────────────────

/**
 * The all-A contract placeholder is structurally valid (passes the regex) but
 * will fail any real on-chain call.  It is only permitted in development and
 * test environments.
 */
export const DEV_CONTRACT_PLACEHOLDER =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export const DEV_RPC_URL = "https://soroban-testnet.stellar.org:443";
export const DEV_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

// ─── Schema factory ───────────────────────────────────────────────────────────

/**
 * Returns a Zod schema for the full environment.
 *
 * @param isDev  When true, missing values fall back to safe development
 *               defaults.  When false (production / build), every field is
 *               required and must be explicitly set.
 */
export const getEnvSchema = (isDev: boolean) => {
  const contractField = isDev
    ? ContractIdSchema.default(DEV_CONTRACT_PLACEHOLDER)
    : ContractIdSchema;

  const urlField = isDev
    ? z.string().url("NEXT_PUBLIC_SOROBAN_RPC_URL must be a valid URL").default(DEV_RPC_URL)
    : z.string().url("NEXT_PUBLIC_SOROBAN_RPC_URL must be a valid URL");

  const passphraseField = isDev
    ? z.string().default(DEV_NETWORK_PASSPHRASE)
    : z.string().min(1, "NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE must not be empty");

  return z.object({
    NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: contractField,
    NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: contractField,
    NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: contractField,
    NEXT_PUBLIC_SOROBAN_RPC_URL: urlField,
    NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: passphraseField,
  });
};

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses and validates raw environment variables.
 *
 * In development / test mode (`isDev = true`) missing values are replaced with
 * safe defaults so local development works out of the box.
 *
 * In production mode (`isDev = false`) every variable must be explicitly set
 * and valid.  A failure throws with a human-readable list of every invalid
 * field so the problem is visible immediately in CI or server logs.
 *
 * @throws {Error} with a descriptive message listing all invalid fields.
 */
export const parseEnv = (
  env: Record<string, string | undefined>,
  isDev: boolean,
) => {
  const result = getEnvSchema(isDev).safeParse(env);

  if (result.success) {
    return result.data;
  }

  // Format every field error on its own line for clear diagnosis.
  const lines = result.error.issues.map(
    (e) => `  - ${e.path.join(".") || "(root)"}: ${e.message}`,
  );

  console.error(
    [
      "",
      "╔══════════════════════════════════════════════════════════════╗",
      "║          ENVIRONMENT CONFIGURATION ERROR                     ║",
      "╚══════════════════════════════════════════════════════════════╝",
      "",
      "The following environment variables are missing or invalid:",
      ...lines,
      "",
      isDev
        ? "In development, unset variables fall back to safe defaults."
        : "In production ALL variables must be explicitly set in your",
      isDev ? "" : "deployment environment or .env file.",
      "",
      "See dongle/.env.example for the full list of required variables.",
      "",
    ].join("\n"),
  );

  throw new Error(
    `Invalid environment configuration (${result.error.issues.length} error${
      result.error.issues.length === 1 ? "" : "s"
    }). See console output above for details.`,
  );
};

// ─── Module-level validation ──────────────────────────────────────────────────

/**
 * Determine strictness:
 *
 * - development / test  → permissive (dev defaults apply)
 * - production build    → strict (NEXT_PUBLIC_* are inlined at build time;
 *                          if they're missing here they'll be missing in the
 *                          shipped bundle)
 * - production runtime  → strict (env must be set in deployment)
 *
 * NOTE: isBuild (NEXT_PHASE === "phase-production-build") is intentionally
 * treated as STRICT so that CI catches missing contract IDs before the bundle
 * is shipped — `NEXT_PUBLIC_*` variables are baked in at build time and cannot
 * be patched at runtime.
 */
const isDev =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

const parsedEnv = parseEnv(
  {
    NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT:
      process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT,
    NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT:
      process.env.NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT,
    NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT:
      process.env.NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT,
    NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
    NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE:
      process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE,
  },
  isDev,
);

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Validated Soroban contract IDs.
 *
 * In development these default to the all-A placeholder
 * (`CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`).
 * In production they are taken verbatim from `NEXT_PUBLIC_*` env vars.
 *
 * @see dongle/.env.example for setup instructions.
 */
export const DONGLE_CONTRACTS = {
  PROJECT_REGISTRY: parsedEnv.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT,
  REVIEW_REGISTRY: parsedEnv.NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT,
  VERIFICATION_REGISTRY: parsedEnv.NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT,
} as const;

/**
 * Validated Soroban RPC / network configuration.
 *
 * @see dongle/.env.example for setup instructions.
 */
export const SOROBAN_CONFIG = {
  RPC_URL: parsedEnv.NEXT_PUBLIC_SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE: parsedEnv.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE,
} as const;
