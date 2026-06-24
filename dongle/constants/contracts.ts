import { z } from "zod";

export const ContractIdSchema = z
  .string()
  .regex(/^C[A-Z2-7]{55}$/, "Invalid Stellar Contract ID format");

export const getEnvSchema = (_isDev: boolean) => {
  const DEV_DEFAULT_CONTRACT =
    "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  return z.object({
    NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: ContractIdSchema.default(
      DEV_DEFAULT_CONTRACT,
    ),
    NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: ContractIdSchema.default(
      DEV_DEFAULT_CONTRACT,
    ),
    NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: ContractIdSchema.default(
      DEV_DEFAULT_CONTRACT,
    ),
    NEXT_PUBLIC_SOROBAN_RPC_URL: z
      .string()
      .url()
      .default("https://soroban-testnet.stellar.org:443"),
    NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: z
      .string()
      .default("Test SDF Network ; September 2015"),
  });
};


interface ValidationError {
  path: string[];
  message: string;
}

interface ZodError {
  errors: ValidationError[];
}

export const parseEnv = (env: Record<string, string | undefined>, isDev: boolean) => {
  try {
    return getEnvSchema(isDev).parse(env);
  } catch (error: unknown) {
    if (error && typeof error === "object" && Array.isArray((error as ZodError).errors)) {
      console.error("Environment Validation Error:");
      ((error as ZodError).errors).forEach((err: ValidationError) => {
        console.error(`- ${err.path.join(".")}: ${err.message}`);
      });
    }
    throw new Error(
      "Invalid environment configuration. Please check your .env file."
    );
  }
};

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
  isDev
);

/**
 * Contract IDs and network configuration for Dongle protocol.
 */
export const DONGLE_CONTRACTS = {
  PROJECT_REGISTRY: parsedEnv.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT,
  REVIEW_REGISTRY: parsedEnv.NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT,
  VERIFICATION_REGISTRY: parsedEnv.NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT,
};

export const SOROBAN_CONFIG = {
  RPC_URL: parsedEnv.NEXT_PUBLIC_SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE: parsedEnv.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE,
};
