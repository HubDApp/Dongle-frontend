import {
  rpc,
  Contract,
  TransactionBuilder,
  Account,
  BASE_FEE,
  nativeToScVal,
} from "stellar-sdk";
import { SOROBAN_CONFIG, DONGLE_CONTRACTS } from "@/constants/contracts";
import { walletService } from "@/services/wallet/wallet.service";
import {
  EXPECTED_NETWORK_LABEL,
  EXPECTED_NETWORK_PASSPHRASE,
  getNetworkLabel,
} from "@/context/wallet.context";
import { generateId } from "@/lib/id-generator";
import type { TransactionPhase } from "@/lib/transaction-progress";

const server = new rpc.Server(SOROBAN_CONFIG.RPC_URL, {
  timeout: 15000,
});

export type TransactionPhaseHandler = (
  phase: TransactionPhase,
  meta?: { txHash?: string; error?: Error },
) => void;

export interface SorobanTransactionOptions {
  onPhaseChange?: TransactionPhaseHandler;
  signal?: AbortSignal;
  timeoutMs?: number;
  intervalMs?: number;
}

// ─── Network mismatch error ──────────────────────────────────────────────────

export class NetworkMismatchError extends Error {
  readonly expectedNetwork: string;
  readonly actualNetwork: string | null;

  constructor(actual: string | null) {
    const expectedLabel = EXPECTED_NETWORK_LABEL;
    const actualLabel = getNetworkLabel(actual);
    super(
      `Wrong network: wallet is on ${actualLabel}, but this app requires ${expectedLabel}. ` +
        `Please switch your Freighter wallet to ${expectedLabel} and try again.`,
    );
    this.name = "NetworkMismatchError";
    this.expectedNetwork = EXPECTED_NETWORK_PASSPHRASE;
    this.actualNetwork = actual;
  }
}

/**
 * Validates that the wallet is on the expected network before any transaction.
 * Throws NetworkMismatchError if the network does not match.
 */
async function assertCorrectNetwork(): Promise<void> {
  const passphrase = await walletService.getNetworkPassphrase();
  if (passphrase !== EXPECTED_NETWORK_PASSPHRASE) {
    throw new NetworkMismatchError(passphrase);
  }
}

export interface ProjectData {
  id: string;
  name: string;
  category: string;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  logoUrl: string;
  docsUrl: string;
  owner: string;
  createdAt: string;
}

export interface ProjectRegistrationParams {
  name: string;
  category: string;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  logoUrl?: string;
  docsUrl?: string;
}

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_POLL_TIMEOUT_MS = 60_000;

function delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error("Transaction polling aborted"));
    }

    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new Error("Transaction polling aborted"));
    }

    if (signal) {
      signal.addEventListener("abort", onAbort);
    }
  });
}

async function pollTransaction(
  hash: string,
  {
    timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
    intervalMs = DEFAULT_POLL_INTERVAL_MS,
    onPhaseChange,
    signal,
  }: {
    timeoutMs?: number;
    intervalMs?: number;
    onPhaseChange?: TransactionPhaseHandler;
    signal?: AbortSignal;
  } = {},
) {
  const startedAt = Date.now();
  onPhaseChange?.("confirming", { txHash: hash });

  if (signal?.aborted) {
    throw new Error("Transaction polling aborted");
  }

  let last = await server.getTransaction(hash);
  while (last.status === "NOT_FOUND") {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `[SorobanService] Timeout waiting for transaction ${hash}. Last status: ${last.status}`,
      );
    }
    if (signal?.aborted) {
      throw new Error("Transaction polling aborted");
    }

    await delayWithSignal(intervalMs, signal);
    last = await server.getTransaction(hash);
  }

  if (last.status !== "SUCCESS") {
    throw new Error(
      `[SorobanService] Transaction ${hash} failed with status: ${last.status}`,
    );
  }

  onPhaseChange?.("success", { txHash: hash });
  return last;
}

async function executeContractTransaction(
  publicKey: string,
  buildOperation: (contract: Contract) => ReturnType<Contract["call"]>,
  options: SorobanTransactionOptions = {},
) {
  const { onPhaseChange, signal, timeoutMs, intervalMs } = options;

  onPhaseChange?.("preparing");
  await assertCorrectNetwork();

  const account = await server.getAccount(publicKey);
  const source = new Account(publicKey, account.sequenceNumber());
  const contract = new Contract(DONGLE_CONTRACTS.PROJECT_REGISTRY);

  const unsignedTx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
  })
    .addOperation(buildOperation(contract))
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(unsignedTx);

  onPhaseChange?.("signing");
  const signedXdr = await walletService.signTransaction(
    preparedTx.toXDR(),
    SOROBAN_CONFIG.NETWORK_PASSPHRASE,
  );

  onPhaseChange?.("submitting");
  const sendResponse = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, SOROBAN_CONFIG.NETWORK_PASSPHRASE),
  );

  if (sendResponse.status === "ERROR") {
    throw new Error(
      "Transaction failed: " + JSON.stringify(sendResponse.errorResult),
    );
  }

  await pollTransaction(sendResponse.hash, {
    onPhaseChange,
    signal,
    timeoutMs,
    intervalMs,
  });

  return { hash: sendResponse.hash, status: "SUCCESS" as const };
}

export const sorobanService = {
  /**
   * Registers a new project in the Project Registry contract.
   */
  async registerProject(
    params: ProjectRegistrationParams,
    options: SorobanTransactionOptions = {},
  ) {
    let publicKey: string;
    try {
      publicKey = await walletService.getPublicKey();
    } catch {
      console.warn(
        "[SorobanService] No wallet connected, using mock registration",
      );
      options.onPhaseChange?.("preparing");
      await new Promise((resolve) => setTimeout(resolve, 500));
      options.onPhaseChange?.("signing");
      await new Promise((resolve) => setTimeout(resolve, 500));
      options.onPhaseChange?.("submitting");
      await new Promise((resolve) => setTimeout(resolve, 500));
      const hash = "mock_hash_" + generateId();
      options.onPhaseChange?.("confirming", { txHash: hash });
      await new Promise((resolve) => setTimeout(resolve, 500));
      options.onPhaseChange?.("success", { txHash: hash });
      return {
        hash,
        status: "SUCCESS",
      };
    }

    const args = [
      nativeToScVal(params.name),
      nativeToScVal(params.category),
      nativeToScVal(params.description),
      nativeToScVal(params.websiteUrl),
      nativeToScVal(params.githubUrl),
      nativeToScVal(params.logoUrl),
      nativeToScVal(params.docsUrl),
    ];

    const result = await executeContractTransaction(
      publicKey,
      (contract) => contract.call("register_project", ...args),
      options,
    );

    console.log("[SorobanService] Registration successful:", result.hash);
    return result;
  },

  /**
   * Request verification for a project.
   * Delegates to verification service for state management.
   */
  async requestVerification(projectId: string, projectName: string) {
    try {
      let userAddress: string;
      try {
        userAddress = await walletService.getPublicKey();
      } catch {
        userAddress = "unknown";
      }

      const { verificationService } = await import("./verification.service");

      const requestId = await verificationService.submitVerificationRequest(
        projectId,
        projectName,
        userAddress,
      );

      console.log(
        `[SorobanService] Verification request submitted: ${requestId}`,
      );

      return { hash: requestId, status: "SUCCESS" };
    } catch (error) {
      console.error("[SorobanService] Error requesting verification:", error);
      throw error;
    }
  },

  /**
   * Get the verification status of a project.
   */
  async getVerificationStatus(
    projectId: string,
  ): Promise<"NONE" | "PENDING" | "VERIFIED" | "REJECTED"> {
    try {
      const { verificationService } = await import("./verification.service");
      const status = await verificationService.getVerificationStatus(projectId);
      console.log(
        `[SorobanService] Verification status for ${projectId}: ${status}`,
      );
      return status;
    } catch (error) {
      console.error(
        "[SorobanService] Error getting verification status:",
        error,
      );
      return "NONE";
    }
  },

  /**
   * Mock method to get project details by ID.
   */
  async getProject(projectId: string): Promise<ProjectData | null> {
    try {
      console.log(`[SorobanService] Getting project details for: ${projectId}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockProjects: ProjectData[] = [
        {
          id: "soroban-swap",
          name: "Soroban Swap",
          category: "defi",
          description: "Next-generation automated market maker on Soroban.",
          websiteUrl: "https://soroban-swap.com",
          githubUrl: "https://github.com/example/soroban-swap",
          logoUrl: "https://example.com/logo1.png",
          docsUrl: "https://docs.soroban-swap.com",
          owner: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
          createdAt: "2024-11-10T00:00:00Z",
        },
        {
          id: "stellar-guardians",
          name: "Stellar Guardians",
          category: "gaming",
          description: "A decentralized strategy game with on-chain assets.",
          websiteUrl: "https://stellar-guardians.com",
          githubUrl: "https://github.com/example/stellar-guardians",
          logoUrl: "https://example.com/logo2.png",
          docsUrl: "https://docs.stellar-guardians.com",
          owner: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674CH",
          createdAt: "2024-09-22T00:00:00Z",
        },
      ];

      return mockProjects.find((p) => p.id === projectId) ?? null;
    } catch (error) {
      console.error("[SorobanService] Error getting project:", error);
      return null;
    }
  },

  /**
   * Updates an existing project in the Project Registry contract.
   */
  async updateProject(
    projectId: string,
    params: ProjectRegistrationParams,
    options: SorobanTransactionOptions = {},
  ) {
    let publicKey: string;
    try {
      publicKey = await walletService.getPublicKey();
    } catch {
      console.warn(
        "[SorobanService] No wallet connected, using mock update",
      );
      options.onPhaseChange?.("preparing");
      await new Promise((resolve) => setTimeout(resolve, 500));
      const hash = "mock_update_hash_" + generateId();
      options.onPhaseChange?.("success", { txHash: hash });
      return {
        hash,
        status: "SUCCESS",
      };
    }

    const project = await this.getProject(projectId);
    if (!project) throw new Error("Project not found");
    if (project.owner !== publicKey) {
      throw new Error("Only project owner can update the project");
    }

    const args = [
      nativeToScVal(projectId),
      nativeToScVal(params.name),
      nativeToScVal(params.category),
      nativeToScVal(params.description),
      nativeToScVal(params.websiteUrl),
      nativeToScVal(params.githubUrl),
      nativeToScVal(params.logoUrl),
      nativeToScVal(params.docsUrl),
    ];

    const result = await executeContractTransaction(
      publicKey,
      (contract) => contract.call("update_project", ...args),
      options,
    );

    console.log("[SorobanService] Update successful:", result.hash);
    return result;
  },

  getServer() {
    return server;
  },
};

