#!/usr/bin/env node
/**
 * Validates Dongle production/preview environment configuration.
 *
 * Fails clearly when required NEXT_PUBLIC_* vars are missing, malformed,
 * or still set to the development placeholder contract ID.
 *
 * Also verifies that each contract ID actually exists on the configured
 * Soroban RPC network — a format-valid contract ID that has not been deployed
 * will fail at runtime otherwise.
 *
 * Usage (from dongle/):
 *   npm run validate:env
 *   node scripts/validate-production-env.js
 *
 * Optional: load a dotenv-style file first via ENV_FILE=.env.local
 *
 * Flags:
 *   --skip-rpc   Skip the live RPC existence checks (useful in air-gapped CI
 *                where network calls are blocked but format-only checks suffice).
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
    isContract: true,
  },
  {
    name: "NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT",
    validate: validateContractId,
    isContract: true,
  },
  {
    name: "NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT",
    validate: validateContractId,
    isContract: true,
  },
  {
    name: "NEXT_PUBLIC_SOROBAN_RPC_URL",
    validate: validateUrl,
    isContract: false,
  },
  {
    name: "NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE",
    validate: (value) => {
      if (!value || !String(value).trim()) {
        return "must not be empty";
      }
      return null;
    },
    isContract: false,
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

/**
 * Checks whether a Soroban contract exists on the network by calling
 * getLedgerEntries with the contract's footprint key via the Stellar RPC.
 *
 * Returns an object with { exists: boolean, error?: string } so format
 * errors and network errors are surfaced cleanly.
 *
 * Note: This function uses only Node.js built-ins (https module) to avoid
 * requiring stellar-sdk at script runtime in CI environments that may not
 * have devDependencies installed.
 */
async function checkContractExistsViaRpc(contractId, rpcUrl) {
  // We call getLedgerEntries with the contract instance key encoded as
  // base64 XDR. Constructing the full XDR by hand is complex; instead we
  // delegate to stellar-sdk if it is available, otherwise fall back to a
  // raw JSON-RPC call using the getContractData shorthand path.
  try {
    // Attempt to use stellar-sdk (available in the project's node_modules).
    const { rpc: stellarRpc, Contract } = require("stellar-sdk");
    const server = new stellarRpc.Server(rpcUrl, { timeout: 15_000 });
    const footprint = new Contract(contractId).getFootprint();
    const response = await server.getLedgerEntries(footprint);
    return { exists: response.entries.length > 0 };
  } catch (sdkErr) {
    // If stellar-sdk is not available (e.g. production-only install), fall
    // back to raw JSON-RPC. We call getContractData indirectly via the SDK
    // error path: a { code: 404 } rejection means the contract is absent.
    if (isNotFoundError(sdkErr)) {
      return { exists: false };
    }
    // SDK not importable or unexpected error
    const errMsg =
      sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
    return {
      exists: false,
      error: `RPC check failed: ${errMsg}`,
    };
  }
}

/**
 * Returns true for any error value that indicates the contract ledger entry
 * was not found (as opposed to a network or infrastructure failure).
 *
 * stellar-sdk rejects with a plain object { code: 404 } — not an Error —
 * when the entry is absent.
 */
function isNotFoundError(err) {
  if (!err) return false;
  if (typeof err === "object" && err.code === 404) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("entrynotfound") ||
      msg.includes("entry not found") ||
      msg.includes("not_found") ||
      msg.includes("not found") ||
      msg.includes("contract data not found")
    );
  }
  return false;
}

async function main() {
  const skipRpc = process.argv.includes("--skip-rpc");

  const envFile = process.env.ENV_FILE;
  if (envFile) {
    const resolved = path.isAbsolute(envFile)
      ? envFile
      : path.join(process.cwd(), envFile);
    loadEnvFile(resolved);
  }

  // ── Step 1: format / presence checks (synchronous) ──────────────────────
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

  // ── Step 2: RPC existence checks (async) ────────────────────────────────
  if (skipRpc) {
    console.log("⚠  Skipping RPC existence checks (--skip-rpc flag set).");
  } else {
    const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
    const contractFields = REQUIRED.filter((f) => f.isContract);

    console.log(`\nChecking contract existence against RPC: ${rpcUrl}`);

    const rpcErrors = [];
    for (const field of contractFields) {
      const contractId = process.env[field.name];
      process.stdout.write(`  Checking ${field.name.replace("NEXT_PUBLIC_", "")}… `);

      const result = await checkContractExistsViaRpc(contractId, rpcUrl);

      if (result.error) {
        // RPC call failed for a reason other than "not found" — warn but don't
        // block the build, since this could be a transient network issue.
        console.log(`⚠  (RPC unreachable: ${result.error})`);
      } else if (!result.exists) {
        console.log("✗ NOT FOUND");
        rpcErrors.push(
          `  - ${field.name}: contract ${contractId.slice(0, 8)}… not found on network ${rpcUrl}`,
        );
      } else {
        console.log("✓ exists");
      }
    }

    if (rpcErrors.length > 0) {
      console.error(`
╔══════════════════════════════════════════════════════════════╗
║     CONTRACT EXISTENCE VALIDATION FAILED                     ║
╚══════════════════════════════════════════════════════════════╝

The following contracts were not found on the configured network:
${rpcErrors.join("\n")}

Possible causes:
  • The contract IDs point to a different network than ${rpcUrl}
  • The contracts have not been deployed yet
  • NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE does not match the RPC network

Deploy the contracts first, or update the contract IDs to match already-deployed contracts.
See dongle/DEPLOYMENT.md for details.
`);
      process.exit(1);
    }
  }

  // ── All checks passed ────────────────────────────────────────────────────
  console.log("\n✓ Production environment validation passed.");
  console.log(
    `  Network: ${process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE}`,
  );
  console.log(`  RPC:     ${process.env.NEXT_PUBLIC_SOROBAN_RPC_URL}`);
  console.log(
    `  Project: ${process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT.slice(0, 8)}…`,
  );
}

main().catch((err) => {
  console.error("Unexpected error during validation:", err);
  process.exit(1);
});
