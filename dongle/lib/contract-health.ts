/**
 * On-chain existence checks for configured Dongle contracts.
 *
 * Verifies each contract instance via Soroban RPC `getContractData` and keeps
 * a small observable store so the UI can warn users and gate on-chain actions.
 */
import { DONGLE_CONTRACTS, DEV_CONTRACT_PLACEHOLDER, SOROBAN_CONFIG } from "@/constants/contracts";

export const CONTRACT_RECHECK_MS = 5 * 60_000;
export const CONTRACT_DEPLOY_DOCS_URL =
  "https://developers.stellar.org/docs/build/smart-contracts/getting-started/deploy-to-testnet";

export type ContractHealthStatus = "unknown" | "checking" | "ok" | "missing" | "mock";

export interface ContractHealthState {
  status: ContractHealthStatus;
  missing: string[];
  checkedAt: string | null;
}

let state: ContractHealthState = { status: "unknown", missing: [], checkedAt: null };
const listeners = new Set<() => void>();

function setState(next: ContractHealthState) {
  state = next;
  listeners.forEach((l) => l());
}

export const getContractHealth = () => state;

export function subscribeContractHealth(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** False when verification determined that configured contracts are missing. */
export const isOnChainEnabled = () => state.status !== "missing";

export async function contractExists(contractId: string): Promise<boolean> {
  const { rpc, xdr } = await import("stellar-sdk");
  const server = new rpc.Server(SOROBAN_CONFIG.RPC_URL, {
    allowHttp: SOROBAN_CONFIG.RPC_URL.startsWith("http://"),
  });
  try {
    await server.getContractData(
      contractId,
      xdr.ScVal.scvLedgerKeyContractInstance(),
      rpc.Durability.Persistent,
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not found|404/i.test(msg)) return false;
    throw err; // network/RPC error — not proof the contract is missing
  }
}

export async function verifyConfiguredContracts(
  contracts: Record<string, string> = DONGLE_CONTRACTS,
): Promise<ContractHealthState> {
  const isDev = process.env.NODE_ENV !== "production";
  const entries = Object.entries(contracts);

  // Dev-only graceful fallback: placeholders mean we're running against mocks.
  if (isDev && entries.some(([, id]) => id === DEV_CONTRACT_PLACEHOLDER)) {
    const next = { status: "mock" as const, missing: [], checkedAt: new Date().toISOString() };
    setState(next);
    return next;
  }

  setState({ ...state, status: "checking" });
  try {
    const results = await Promise.all(
      entries.map(async ([name, id]) => ((await contractExists(id)) ? null : name)),
    );
    const missing = results.filter((n): n is string => n !== null);
    const next: ContractHealthState = {
      status: missing.length ? "missing" : "ok",
      missing,
      checkedAt: new Date().toISOString(),
    };
    setState(next);
    if (missing.length) await notifyAdmins(missing);
    return next;
  } catch {
    // RPC unreachable — keep previous verdict rather than blocking users.
    const next = { ...state, status: state.status === "checking" ? "unknown" : state.status } as ContractHealthState;
    setState(next);
    return next;
  }
}

async function notifyAdmins(missing: string[]): Promise<void> {
  console.error(`[contract-health] Missing on-chain contracts: ${missing.join(", ")}`);
  try {
    const { track } = await import("@/lib/analytics/client");
    track("contract_verification_failed", { missing: missing.join(",") });
    const { emitNotificationEvent } = await import("@/lib/notifications/emit");
    await emitNotificationEvent({
      type: "contract_missing",
      recipientId: "admin",
      priority: "urgent",
      messageKey: "contract_missing",
      messageParams: { contracts: missing.join(", ") },
    });
  } catch {
    /* best effort */
  }
}
