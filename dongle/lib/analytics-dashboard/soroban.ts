/**
 * Optional Soroban aggregation for analytics.
 *
 * Contract IDs and RPC URL come from environment configuration
 * (`NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT`, `NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT`,
 * `NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT`, `NEXT_PUBLIC_SOROBAN_RPC_URL`).
 *
 * Placeholder / missing contracts are treated as "catalog only" rather than
 * fabricated on-chain metrics. RPC failures are returned to the caller so
 * the dashboard can show stale/catalog data plus an error flag.
 */

import { DEV_CONTRACT_PLACEHOLDER } from "@/constants/contracts";
import type { AnalyticsDataset, AnalyticsVerification } from "./metrics";
import { mockProjects } from "@/data/mockProjects";

export interface SorobanAggregateResult {
  dataset: AnalyticsDataset;
  source: "catalog" | "soroban" | "mixed";
  rpcError?: string;
}

function isUsableContractId(value: string | undefined): boolean {
  if (!value) return false;
  if (value === DEV_CONTRACT_PLACEHOLDER) return false;
  return /^C[A-Z2-7]{55}$/.test(value);
}

export async function loadAnalyticsDataset(): Promise<SorobanAggregateResult> {
  const catalog: AnalyticsDataset = {
    projects: mockProjects,
    reviews: [],
    verifications: inferCatalogVerifications(mockProjects.length),
  };

  const projectId = process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT;
  const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
  if (!isUsableContractId(projectId) || !rpcUrl) {
    return { dataset: catalog, source: "catalog" };
  }

  try {
    const onChain = await fetchSorobanSnapshot(rpcUrl, projectId);
    return {
      dataset: {
        projects: onChain.projects.length > 0 ? onChain.projects : catalog.projects,
        reviews: onChain.reviews,
        verifications: onChain.verifications.length > 0 ? onChain.verifications : catalog.verifications,
      },
      source: onChain.projects.length > 0 ? "soroban" : "mixed",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown RPC error";
    console.error("[analytics] Soroban aggregation failed", message);
    return { dataset: catalog, source: "catalog", rpcError: message };
  }
}

/**
 * Catalog projects do not store verification status. We do not invent it.
 * An empty verification list yields a null approval rate until the cron
 * successfully reads the Verification Registry.
 */
function inferCatalogVerifications(_count: number): AnalyticsVerification[] {
  return [];
}

async function fetchSorobanSnapshot(
  rpcUrl: string,
  contractId: string,
): Promise<AnalyticsDataset> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getHealth",
        params: [],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`RPC HTTP ${response.status}`);
    }
    const body = (await response.json()) as { error?: { message?: string } };
    if (body.error) {
      throw new Error(body.error.message ?? "RPC error");
    }
    // Health-check succeeded. Full ledger scan of project/review events
    // requires indexer pagination that this frontend repo does not own.
    // We return an empty on-chain snapshot so catalog data remains the
    // source of truth until a dedicated indexer endpoint is wired.
    void contractId;
    return { projects: [], reviews: [], verifications: [] };
  } finally {
    clearTimeout(timer);
  }
}

export function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 250,
): Promise<T> {
  return fn().catch(async (error) => {
    if (attempts <= 1) throw error;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(fn, attempts - 1, delayMs * 2);
  });
}
