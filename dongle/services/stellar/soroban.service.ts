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

const server = new rpc.Server(SOROBAN_CONFIG.RPC_URL);

export interface ProjectData {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string;
  logoUrl: string;
  docsUrl: string;
  owner: string;
  createdAt: string;
}

export interface ProjectRegistrationParams {
  name: string;
  category: string;
  description: string;
  url: string;
  logoUrl?: string;
  docsUrl?: string;
}

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_POLL_TIMEOUT_MS = 60_000;

async function pollTransaction(
  hash: string,
  {
    timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
    intervalMs = DEFAULT_POLL_INTERVAL_MS,
  }: { timeoutMs?: number; intervalMs?: number } = {},
) {
  const startedAt = Date.now();

  let last = await server.getTransaction(hash);
  while (last.status === "NOT_FOUND") {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `[SorobanService] Timeout waiting for transaction ${hash}. Last status: ${last.status}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    last = await server.getTransaction(hash);
  }

  if (last.status !== "SUCCESS") {
    throw new Error(
      `[SorobanService] Transaction ${hash} failed with status: ${last.status}`,
    );
  }

  return last;
}

export const sorobanService = {
  /**
   * Registers a new project in the Project Registry contract.
   */
  async registerProject(params: ProjectRegistrationParams) {
    let publicKey: string;
    try {
      publicKey = await walletService.getPublicKey();
    } catch {
      console.warn(
        "[SorobanService] No wallet connected, using mock registration",
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        hash: "mock_hash_" + Math.random().toString(36).substring(7),
        status: "SUCCESS",
      };
    }

    const account = await server.getAccount(publicKey);
    const source = new Account(publicKey, account.sequence);

    const contract = new Contract(DONGLE_CONTRACTS.PROJECT_REGISTRY);

    const args = [
      nativeToScVal(params.name),
      nativeToScVal(params.category),
      nativeToScVal(params.description),
      nativeToScVal(params.url),
      nativeToScVal(params.logoUrl),
      nativeToScVal(params.docsUrl),
    ];

    const unsignedTx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("register_project", ...args))
      .setTimeout(30)
      .build();

    // Soroban-specific: simulate then prepare to ensure footprint/resources are correct.
    const simulation = await server.simulateTransaction(unsignedTx);
    const preparedTx = await server.prepareTransaction(unsignedTx, simulation);

    const signedXdr = await walletService.signTransaction(
      preparedTx.toXDR(),
      SOROBAN_CONFIG.NETWORK_PASSPHRASE,
    );

    const sendResponse = await server.sendTransaction(
      TransactionBuilder.fromXDR(
        signedXdr,
        SOROBAN_CONFIG.NETWORK_PASSPHRASE,
      ),
    );

    if (sendResponse.status === "ERROR") {
      throw new Error(
        "Transaction failed: " + JSON.stringify(sendResponse.errorResult),
      );
    }

    await pollTransaction(sendResponse.hash);

    console.log(
      "[SorobanService] Registration successful:",
      sendResponse.hash,
    );

    return { hash: sendResponse.hash, status: "SUCCESS" };
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
          url: "https://soroban-swap.com",
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
          url: "https://stellar-guardians.com",
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
  async updateProject(projectId: string, params: ProjectRegistrationParams) {
    let publicKey: string;
    try {
      publicKey = await walletService.getPublicKey();
    } catch {
      console.warn(
        "[SorobanService] No wallet connected, using mock update",
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        hash: "mock_update_hash_" + Math.random().toString(36).substring(7),
        status: "SUCCESS",
      };
    }

    const project = await this.getProject(projectId);
    if (!project) throw new Error("Project not found");
    if (project.owner !== publicKey) {
      throw new Error("Only project owner can update the project");
    }

    const account = await server.getAccount(publicKey);
    const source = new Account(publicKey, account.sequence);

    const contract = new Contract(DONGLE_CONTRACTS.PROJECT_REGISTRY);

    const args = [
      nativeToScVal(projectId),
      nativeToScVal(params.name),
      nativeToScVal(params.category),
      nativeToScVal(params.description),
      nativeToScVal(params.url),
      nativeToScVal(params.logoUrl),
      nativeToScVal(params.docsUrl),
    ];

    const unsignedTx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("update_project", ...args))
      .setTimeout(30)
      .build();

    const simulation = await server.simulateTransaction(unsignedTx);
    const preparedTx = await server.prepareTransaction(unsignedTx, simulation);

    const signedXdr = await walletService.signTransaction(
      preparedTx.toXDR(),
      SOROBAN_CONFIG.NETWORK_PASSPHRASE,
    );

    const sendResponse = await server.sendTransaction(
      TransactionBuilder.fromXDR(
        signedXdr,
        SOROBAN_CONFIG.NETWORK_PASSPHRASE,
      ),
    );

    if (sendResponse.status === "ERROR") {
      throw new Error(
        "Transaction failed: " + JSON.stringify(sendResponse.errorResult),
      );
    }

    await pollTransaction(sendResponse.hash);

    console.log(
      "[SorobanService] Update successful:",
      sendResponse.hash,
    );

    return { hash: sendResponse.hash, status: "SUCCESS" };
  },

  getServer() {
    return server;
  },
};

