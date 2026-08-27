import { rpc } from "stellar-sdk";
import { SOROBAN_CONFIG } from "@/constants/contracts";

const server = new rpc.Server(SOROBAN_CONFIG.RPC_URL, { timeout: 15_000 });

const BATCH_LIMIT = 100;
const DEBOUNCE_MS = 50;

interface PendingRequest {
  contractId: string;
  key: string;
  resolve: (value: rpc.Api.LedgerEntryResult | null) => void;
  reject: (reason: unknown) => void;
}

let pendingBatch: PendingRequest[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function flushBatch() {
  const batch = pendingBatch;
  pendingBatch = [];
  debounceTimer = null;

  if (batch.length === 0) return;

  // Split into chunks of BATCH_LIMIT
  for (let i = 0; i < batch.length; i += BATCH_LIMIT) {
    const chunk = batch.slice(i, i + BATCH_LIMIT);
    processChunk(chunk);
  }
}

async function processChunk(chunk: PendingRequest[]) {
  const promises = chunk.map(async (req) => {
    try {
      const result = await server.getContractData(req.contractId, req.key);
      req.resolve(result);
    } catch {
      req.resolve(null);
    }
  });

  await Promise.allSettled(promises);
}

function scheduleBatch() {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushBatch, DEBOUNCE_MS);
}

/**
 * Batched Soroban RPC call for getContractData.
 * Requests within the debounce window are grouped and sent together.
 */
export function batchGetContractData(
  contractId: string,
  key: string,
): Promise<rpc.Api.LedgerEntryResult | null> {
  return new Promise((resolve, reject) => {
    pendingBatch.push({ contractId, key, resolve, reject });

    if (pendingBatch.length >= BATCH_LIMIT) {
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = null;
      flushBatch();
    } else {
      scheduleBatch();
    }
  });
}

/**
 * Flush any pending batch immediately (useful on page unload).
 */
export function flushPendingBatch(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  flushBatch();
}
