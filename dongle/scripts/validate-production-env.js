#!/usr/bin/env node
/**
 * Validates Dongle production/preview environment configuration.
 *
 * Fails clearly when required NEXT_PUBLIC_* vars are missing, malformed,
 * or still set to the development placeholder contract ID.
 *
 * Usage (from dongle/):
 *   npm run validate:env
 *   node scripts/validate-production-env.js
 *
 * Optional: load a dotenv-style file first via ENV_FILE=.env.local
 */

const fs = require("fs");
const path = require("path");

const CONTRACT_ID_RE = /^C[A-Z2-7]{55}$/;
const DEV_CONTRACT_PLACEHOLDER =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const REQUIRED = [
  {
    name: "NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT",
    validate: validateContractId,
  },
  {
    name: "NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT",
    validate: validateContractId,
  },
  {
    name: "NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT",
    validate: validateContractId,
  },
  {
    name: "NEXT_PUBLIC_SOROBAN_RPC_URL",
    validate: validateUrl,
  },
  {
    name: "NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE",
    validate: (value) => {
      if (!value || !String(value).trim()) {
        return "must not be empty";
      }
      return null;
    },
  },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`ENV_FILE not found: ${filePath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function validateContractId(value) {
  if (!value) return "is required";
  if (!CONTRACT_ID_RE.test(value)) {
    return "must be a 56-char Stellar contract ID (C + 55 base32 chars A-Z/2-7)";
  }
  if (value === DEV_CONTRACT_PLACEHOLDER) {
    return "must not use the development placeholder contract ID — set a real deployed contract";
  }
  return null;
}

function validateUrl(value) {
  if (!value) return "is required";
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return null;
  } catch {
    return "must be a valid URL";
  }
}

function main() {
  const envFile = process.env.ENV_FILE;
  if (envFile) {
    const resolved = path.isAbsolute(envFile)
      ? envFile
      : path.join(process.cwd(), envFile);
    loadEnvFile(resolved);
  }

  const errors = [];
  for (const field of REQUIRED) {
    const message = field.validate(process.env[field.name]);
    if (message) {
      errors.push(`  - ${field.name}: ${message}`);
    }
  }

  if (errors.length > 0) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║     PRODUCTION ENVIRONMENT VALIDATION FAILED                 ║
╚══════════════════════════════════════════════════════════════╝

The following environment variables are missing or invalid:
${errors.join("\n")}

Fix these in your hosting provider (Vercel → Environment Variables)
or local .env before deploying. See dongle/DEPLOYMENT.md.
`);
    process.exit(1);
  }

  console.log("✓ Production environment validation passed.");
  console.log(
    `  Network: ${process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE}`,
  );
  console.log(`  RPC:     ${process.env.NEXT_PUBLIC_SOROBAN_RPC_URL}`);
  console.log(
    `  Project: ${process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT.slice(0, 8)}…`,
  );
}

main();
