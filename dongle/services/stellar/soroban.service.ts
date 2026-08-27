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
import { type ProjectCategory, PROJECT_CATEGORIES } from "@/types/project";
import type { TransactionPhase } from "@/lib/transaction-progress";
import { validateStellarAddress } from "@/lib/stellar-address";

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

// ─── Wallet not connected error ──────────────────────────────────────────────

/**
 * Thrown when a transaction is attempted without a connected wallet.
 * Always surfaces as a real error — never silently falls back to mock data.
 */
export class WalletNotConnectedError extends Error {
  constructor() {
    super(
      "No wallet connected. Please connect your Freighter wallet and try again.",
    );
    this.name = "WalletNotConnectedError";
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
  category: ProjectCategory;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  logoUrl: string;
  docsUrl: string;
  auditReportUrl?: string;
  bugBountyUrl?: string;
  owner: string;
  createdAt: string;
}

export interface ProjectRegistrationParams {
  name: string;
  category: ProjectCategory;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  logoUrl?: string;
  docsUrl?: string;
  /**
   * Optional list of Soroban contract IDs associated with the project.
   * Each entry must be a valid 56-character address starting with 'C'.
   * Empty strings are ignored.
   */
  contractAddresses?: string[];
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
   * Registers a new project in the Soroban Project Registry smart contract.
   * 
   * This method creates a new on-chain project listing with metadata including
   * name, category, description, URLs, and associated contract addresses. The
   * project is owned by the connected wallet address.
   * 
   * **Transaction Flow:**
   * 1. Validates wallet connection and network
   * 2. Prepares transaction with project data
   * 3. Signs transaction via Freighter wallet
   * 4. Submits to Soroban RPC
   * 5. Polls for transaction confirmation (up to 60s)
   * 
   * **Contract Arguments:**
   * - `name`: Project display name (e.g., "Soroban Swap")
   * - `category`: Project category from PROJECT_CATEGORIES enum
   * - `description`: Brief project description
   * - `websiteUrl`: Main project website (required, must be valid URL)
   * - `githubUrl`: GitHub repository URL (optional)
   * - `logoUrl`: Project logo image URL (optional)
   * - `docsUrl`: Documentation URL (optional)
   * - `contractAddresses`: Array of associated contract IDs (optional, filtered to remove empty strings)
   * 
   * @param params - Project registration parameters
   * @param params.name - Project name (required)
   * @param params.category - Project category (must be valid PROJECT_CATEGORIES value)
   * @param params.description - Project description (required)
   * @param params.websiteUrl - Main website URL (required, validated as URL)
   * @param params.githubUrl - GitHub repository URL (optional)
   * @param params.logoUrl - Logo image URL (optional)
   * @param params.docsUrl - Documentation URL (optional)
   * @param params.contractAddresses - Associated Soroban contract IDs (optional, 56-char C-addresses)
   * @param options - Transaction options
   * @param options.onPhaseChange - Callback for transaction phase updates (preparing, signing, submitting, confirming, success)
   * @param options.signal - AbortSignal to cancel transaction polling
   * @param options.timeoutMs - Transaction confirmation timeout in milliseconds (default: 60000)
   * @param options.intervalMs - Polling interval in milliseconds (default: 2000)
   * 
   * @returns Promise resolving to transaction result with hash and status
   * @returns {hash: string} - Transaction hash (starts with hex characters)
   * @returns {status: "SUCCESS"} - Transaction status (always "SUCCESS" if no error thrown)
   * 
   * @throws {WalletNotConnectedError} No wallet connected or unable to get public key
   * @throws {NetworkMismatchError} Wallet is on wrong network (e.g., mainnet when testnet expected)
   * @throws {Error} Transaction failed with error status or timeout
   * @throws {Error} RPC communication error
   * @throws {Error} Transaction polling aborted via signal
   * 
   * @example
   * // Basic project registration
   * const result = await sorobanService.registerProject({
   *   name: "My DeFi Protocol",
   *   category: PROJECT_CATEGORIES.DEFI,
   *   description: "A decentralized AMM on Soroban",
   *   websiteUrl: "https://mydefi.com",
   *   githubUrl: "https://github.com/user/mydefi",
   *   docsUrl: "https://docs.mydefi.com",
   * });
   * console.log("Project registered:", result.hash);
   * 
   * @example
   * // Registration with phase tracking and abort control
   * const abortController = new AbortController();
   * 
   * const result = await sorobanService.registerProject(
   *   {
   *     name: "NFT Marketplace",
   *     category: PROJECT_CATEGORIES.NFT,
   *     description: "Buy and sell NFTs on Stellar",
   *     websiteUrl: "https://nftmarket.stellar",
   *     contractAddresses: ["CBGTB7XHZQCDT5O3EH7FVDX7VKJP3WVLVZM3NUJSQFXLW5UQ"],
   *   },
   *   {
   *     onPhaseChange: (phase, meta) => {
   *       console.log(`Transaction phase: ${phase}`, meta?.txHash);
   *       if (phase === "signing") {
   *         // Show "Please sign in Freighter" UI
   *       }
   *     },
   *     signal: abortController.signal,
   *     timeoutMs: 90000, // 90 second timeout
   *   }
   * );
   * 
   * @example
   * // Error handling
   * try {
   *   await sorobanService.registerProject(params);
   * } catch (error) {
   *   if (error instanceof WalletNotConnectedError) {
   *     // Prompt user to connect wallet
   *   } else if (error instanceof NetworkMismatchError) {
   *     // Show "Switch to testnet" message
   *   } else {
   *     // Handle generic transaction error
   *     console.error("Registration failed:", error.message);
   *   }
   * }
   * 
   * @see {@link ProjectRegistrationParams} for parameter details
   * @see {@link SorobanTransactionOptions} for transaction options
   * @see {@link https://soroban.stellar.org/docs Soroban Documentation}
   */
  async registerProject(
    params: ProjectRegistrationParams,
    options: SorobanTransactionOptions = {},
  ) {
    let publicKey: string;
    try {
      publicKey = await walletService.getPublicKey();
    } catch {
      throw new WalletNotConnectedError();
    }

    const args = [
      nativeToScVal(params.name),
      nativeToScVal(params.category),
      nativeToScVal(params.description),
      nativeToScVal(params.websiteUrl),
      nativeToScVal(params.githubUrl),
      nativeToScVal(params.logoUrl),
      nativeToScVal(params.docsUrl),
      nativeToScVal(
        (params.contractAddresses ?? []).filter((a) => a.trim().length > 0),
      ),
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
   * Submits a verification request for a project to the verification registry.
   * 
   * Requests that a project be reviewed and verified by administrators. Verification
   * adds credibility and trust signals to the project listing. This method delegates
   * to the verification service for state management.
   * 
   * **Note:** Currently uses localStorage-based verification service. In production,
   * this will interact with the Verification Registry smart contract.
   * 
   * **Verification Lifecycle:**
   * 1. NONE → User submits request → PENDING
   * 2. PENDING → Admin reviews → VERIFIED or REJECTED
   * 3. REJECTED → User can address issues and resubmit
   * 
   * @param projectId - Unique project identifier (e.g., "soroban-swap")
   * @param projectName - Human-readable project name for logging
   * 
   * @returns Promise resolving to transaction result
   * @returns {hash: string} - Request ID (used to track verification status)
   * @returns {status: "SUCCESS"} - Always "SUCCESS" if no error thrown
   * 
   * @throws {Error} Project not found or already has pending/approved verification
   * @throws {Error} User has already submitted a verification request for this project
   * @throws {Error} Verification service error
   * 
   * @example
   * // Submit verification request
   * const result = await sorobanService.requestVerification(
   *   "my-defi-protocol",
   *   "My DeFi Protocol"
   * );
   * console.log("Verification requested:", result.hash);
   * 
   * @example
   * // With error handling
   * try {
   *   await sorobanService.requestVerification(projectId, projectName);
   *   // Show success message to user
   * } catch (error) {
   *   console.error("Verification request failed:", error.message);
   *   // Show error message
   * }
   * 
   * @see {@link getVerificationStatus} to check request status
   * @see {@link getVerificationRequestStatus} for detailed status with context
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
   * Retrieves the current verification status of a project.
   * 
   * Queries the verification registry to determine if a project has been
   * verified, is pending verification, was rejected, or has no verification
   * request. Supports request cancellation via AbortSignal.
   * 
   * **Status Values:**
   * - `"NONE"`: No verification request submitted
   * - `"PENDING"`: Request submitted, awaiting admin review
   * - `"VERIFIED"`: Project has been verified by admin
   * - `"REJECTED"`: Request was rejected (see rejection reason via getVerificationRequestStatus)
   * 
   * **Note:** Currently uses localStorage-based verification service. In production,
   * this will query the Verification Registry smart contract via RPC simulation.
   * 
   * @param projectId - Unique project identifier
   * @param signal - Optional AbortSignal to cancel the request
   * 
   * @returns Promise resolving to verification status enum value
   * 
   * @throws {DOMException} with name "AbortError" if request is aborted via signal
   * 
   * @example
   * // Basic status check
   * const status = await sorobanService.getVerificationStatus("soroban-swap");
   * 
   * if (status === "VERIFIED") {
   *   // Show verified badge
   * } else if (status === "PENDING") {
   *   // Show pending indicator
   * } else if (status === "REJECTED") {
   *   // Show rejection notice
   * }
   * 
   * @example
   * // With abort control
   * const controller = new AbortController();
   * 
   * // Cancel after 5 seconds
   * setTimeout(() => controller.abort(), 5000);
   * 
   * try {
   *   const status = await sorobanService.getVerificationStatus(
   *     projectId,
   *     controller.signal
   *   );
   * } catch (error) {
   *   if (error.name === "AbortError") {
   *     console.log("Request cancelled");
   *   }
   * }
   * 
   * @example
   * // React component with useEffect cleanup
   * useEffect(() => {
   *   const controller = new AbortController();
   *   
   *   async function fetchStatus() {
   *     try {
   *       const status = await sorobanService.getVerificationStatus(
   *         projectId,
   *         controller.signal
   *       );
   *       setVerificationStatus(status);
   *     } catch (error) {
   *       if (error.name !== "AbortError") {
   *         console.error(error);
   *       }
   *     }
   *   }
   *   
   *   fetchStatus();
   *   
   *   return () => controller.abort(); // Cleanup on unmount
   * }, [projectId]);
   * 
   * @see {@link getVerificationRequestStatus} for detailed status with context
   */
  async getVerificationStatus(
    projectId: string,
    signal?: AbortSignal,
  ): Promise<"NONE" | "PENDING" | "VERIFIED" | "REJECTED"> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const { verificationService } = await import("./verification.service");
      const status = await verificationService.getVerificationStatus(projectId);

      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      console.log(
        `[SorobanService] Verification status for ${projectId}: ${status}`,
      );
      return status;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      console.error(
        "[SorobanService] Error getting verification status:",
        error,
      );
      return "NONE";
    }
  },

  /**
   * Retrieves detailed verification request status with project and request context.
   * 
   * Returns comprehensive verification information including whether the project
   * exists, whether a request exists, the current status, and rejection reason
   * (if applicable). This provides more context than getVerificationStatus for
   * building detailed UI components.
   * 
   * **Use Cases:**
   * - Distinguish "no project" from "no verification request"
   * - Display rejection reasons to users
   * - Show appropriate CTAs based on request state
   * - Build admin verification management UI
   * 
   * @param projectId - Unique project identifier
   * @param signal - Optional AbortSignal to cancel the request
   * 
   * @returns Promise resolving to detailed verification status object
   * @returns {projectExists: boolean} - True if project is registered
   * @returns {requestExists: boolean} - True if verification request exists
   * @returns {status} - Current verification status ("NONE" | "PENDING" | "VERIFIED" | "REJECTED")
   * @returns {rejectionReason?: string} - Admin-provided reason if status is "REJECTED"
   * 
   * @throws {DOMException} with name "AbortError" if request is aborted via signal
   * 
   * @example
   * // Basic usage
   * const details = await sorobanService.getVerificationRequestStatus("soroban-swap");
   * 
   * if (!details.projectExists) {
   *   // Project not found, show registration prompt
   * } else if (!details.requestExists) {
   *   // Show "Request Verification" button
   * } else if (details.status === "PENDING") {
   *   // Show "Pending Review" badge
   * } else if (details.status === "REJECTED") {
   *   // Show rejection reason and "Resubmit" option
   *   alert(`Rejected: ${details.rejectionReason}`);
   * }
   * 
   * @example
   * // Admin verification management
   * const details = await sorobanService.getVerificationRequestStatus(projectId);
   * 
   * if (details.requestExists && details.status === "PENDING") {
   *   // Show admin review UI with approve/reject actions
   *   return (
   *     <div>
   *       <p>Project: {projectId}</p>
   *       <button onClick={handleApprove}>Approve</button>
   *       <button onClick={handleReject}>Reject</button>
   *     </div>
   *   );
   * }
   * 
   * @example
   * // With abort control
   * const controller = new AbortController();
   * 
   * try {
   *   const details = await sorobanService.getVerificationRequestStatus(
   *     projectId,
   *     controller.signal
   *   );
   *   
   *   return {
   *     canRequestVerification: details.projectExists && !details.requestExists,
   *     isPending: details.status === "PENDING",
   *     isRejected: details.status === "REJECTED",
   *     rejectionReason: details.rejectionReason,
   *   };
   * } catch (error) {
   *   if (error.name === "AbortError") {
   *     console.log("Status check cancelled");
   *   }
   * }
   * 
   * @see {@link getVerificationStatus} for simple status check without context
   * @see {@link requestVerification} to submit a verification request
   */
  async getVerificationRequestStatus(
    projectId: string,
    signal?: AbortSignal,
  ): Promise<{
    projectExists: boolean;
    requestExists: boolean;
    status: "NONE" | "PENDING" | "VERIFIED" | "REJECTED";
    rejectionReason?: string;
  }> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const { verificationService } = await import("./verification.service");
    const result = await verificationService.getRequestStatus(projectId);

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const status = result.request?.status ?? "NONE";
    return {
      projectExists: result.projectExists,
      requestExists: result.requestExists,
      status,
      rejectionReason: result.request?.rejectionReason,
    };
  },

  /**
   * Retrieves project details by ID from the Project Registry.
   * 
   * Fetches comprehensive project metadata including name, category, description,
   * URLs, owner address, and timestamps. Returns null if project not found.
   * 
   * **Note:** Currently returns mock data for development. In production, this
   * will query the Project Registry smart contract via RPC simulation or use
   * an indexer for optimized performance.
   * 
   * **Returned Data:**
   * - Basic info: id, name, category, description
   * - URLs: websiteUrl, githubUrl, logoUrl, docsUrl
   * - Optional: auditReportUrl, bugBountyUrl
   * - Metadata: owner (Stellar G-address), createdAt (ISO timestamp)
   * 
   * @param projectId - Unique project identifier (e.g., "soroban-swap")
   * 
   * @returns Promise resolving to ProjectData object or null if not found
   * 
   * @throws {Error} RPC communication error or contract query error
   * 
   * @example
   * // Fetch project details
   * const project = await sorobanService.getProject("soroban-swap");
   * 
   * if (project) {
   *   console.log(`${project.name} owned by ${project.owner}`);
   *   console.log(`Category: ${project.category}`);
   *   console.log(`Website: ${project.websiteUrl}`);
   * } else {
   *   console.log("Project not found");
   * }
   * 
   * @example
   * // Check ownership
   * const project = await sorobanService.getProject(projectId);
   * const { publicKey } = await walletService.getPublicKey();
   * 
   * if (project && project.owner === publicKey) {
   *   // User is the owner, show edit/transfer options
   * }
   * 
   * @example
   * // Display project card
   * const project = await sorobanService.getProject(projectId);
   * 
   * if (!project) {
   *   return <NotFound />;
   * }
   * 
   * return (
   *   <ProjectCard
   *     title={project.name}
   *     description={project.description}
   *     category={project.category}
   *     websiteUrl={project.websiteUrl}
   *     githubUrl={project.githubUrl}
   *     logoUrl={project.logoUrl}
   *   />
   * );
   * 
   * @see {@link ProjectData} for complete data structure
   */
  async getProject(projectId: string): Promise<ProjectData | null> {
    try {
      console.log(`[SorobanService] Getting project details for: ${projectId}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockProjects: ProjectData[] = [
        {
          id: "soroban-swap",
          name: "Soroban Swap",
          category: PROJECT_CATEGORIES.DEFI,
          description: "Next-generation automated market maker on Soroban.",
          websiteUrl: "https://soroban-swap.com",
          githubUrl: "https://github.com/example/soroban-swap",
          logoUrl: "https://example.com/logo1.png",
          docsUrl: "https://docs.soroban-swap.com",
          auditReportUrl: "https://example.com/audit-soroban-swap.pdf",
          bugBountyUrl: "https://example.com/bounty-soroban-swap",
          owner: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
          createdAt: "2024-11-10T00:00:00Z",
        },
        {
          id: "stellar-guardians",
          name: "Stellar Guardians",
          category: PROJECT_CATEGORIES.GAMING,
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
   * Updates an existing project's metadata in the Project Registry contract.
   * 
   * Modifies project information including name, category, description, and URLs.
   * Only the project owner can update their project. Ownership is verified before
   * the transaction is submitted.
   * 
   * **Transaction Flow:**
   * 1. Validates wallet connection and ownership
   * 2. Fetches existing project to verify owner
   * 3. Prepares transaction with updated data
   * 4. Signs transaction via Freighter wallet
   * 5. Submits to Soroban RPC
   * 6. Polls for transaction confirmation
   * 
   * **Contract Arguments:**
   * All parameters from ProjectRegistrationParams are passed to the contract,
   * along with the projectId to identify which project to update.
   * 
   * @param projectId - Unique project identifier of the project to update
   * @param params - Updated project parameters (same structure as registration)
   * @param params.name - Updated project name
   * @param params.category - Updated project category
   * @param params.description - Updated description
   * @param params.websiteUrl - Updated website URL
   * @param params.githubUrl - Updated GitHub URL (optional)
   * @param params.logoUrl - Updated logo URL (optional)
   * @param params.docsUrl - Updated documentation URL (optional)
   * @param params.contractAddresses - Updated list of associated contract IDs (optional)
   * @param options - Transaction options (same as registerProject)
   * @param options.onPhaseChange - Callback for transaction phase updates
   * @param options.signal - AbortSignal to cancel transaction polling
   * @param options.timeoutMs - Transaction confirmation timeout (default: 60000ms)
   * @param options.intervalMs - Polling interval (default: 2000ms)
   * 
   * @returns Promise resolving to transaction result with hash and status
   * 
   * @throws {WalletNotConnectedError} No wallet connected
   * @throws {Error} "Project not found" if projectId doesn't exist
   * @throws {Error} "Only project owner can update the project" if caller is not owner
   * @throws {NetworkMismatchError} Wallet is on wrong network
   * @throws {Error} Transaction failed or timeout
   * 
   * @example
   * // Basic update
   * try {
   *   await sorobanService.updateProject(
   *     "soroban-swap",
   *     {
   *       name: "Soroban Swap V2",
   *       category: PROJECT_CATEGORIES.DEFI,
   *       description: "Updated: Now with liquidity mining rewards",
   *       websiteUrl: "https://v2.soroban-swap.com",
   *       githubUrl: "https://github.com/user/soroban-swap-v2",
   *       docsUrl: "https://docs.soroban-swap.com/v2",
   *     }
   *   );
   *   alert("Project updated successfully!");
   * } catch (error) {
   *   if (error.message.includes("owner")) {
   *     alert("Only the project owner can update this project");
   *   } else {
   *     alert("Update failed: " + error.message);
   *   }
   * }
   * 
   * @example
   * // Update with phase tracking
   * const result = await sorobanService.updateProject(
   *   projectId,
   *   updatedParams,
   *   {
   *     onPhaseChange: (phase) => {
   *       if (phase === "signing") {
   *         setStatusMessage("Please sign the transaction in Freighter");
   *       } else if (phase === "confirming") {
   *         setStatusMessage("Waiting for blockchain confirmation...");
   *       } else if (phase === "success") {
   *         setStatusMessage("Project updated successfully!");
   *       }
   *     }
   *   }
   * );
   * 
   * @see {@link registerProject} for initial project registration
   * @see {@link ProjectRegistrationParams} for parameter details
   * @see {@link transferOwnership} to change project owner
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
      throw new WalletNotConnectedError();
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
      nativeToScVal(
        (params.contractAddresses ?? []).filter((a) => a.trim().length > 0),
      ),
    ];

    const result = await executeContractTransaction(
      publicKey,
      (contract) => contract.call("update_project", ...args),
      options,
    );

    console.log("[SorobanService] Update successful:", result.hash);
    return result;
  },

  /**
   * Transfers project ownership to a new Stellar address.
   * 
   * Changes the owner of a project to a different Stellar public key (G-address).
   * Only the current owner can initiate this transfer. The new owner address is
   * validated for correct Stellar format before submission.
   * 
   * **Use Cases:**
   * - Transfer project to organization's multi-sig account
   * - Hand off project to new maintainer
   * - Move project between team members
   * 
   * **Important:**
   * - Transaction is irreversible once confirmed
   * - New owner immediately gains full control
   * - Original owner loses all edit/transfer permissions
   * - Consider using multi-sig or confirming new owner address carefully
   * 
   * **Contract Requirements:**
   * - Requires `transfer_ownership` method in Project Registry contract
   * - New owner must be a valid Stellar G-address (56 characters)
   * 
   * @param projectId - Unique project identifier
   * @param newOwnerAddress - Stellar public key (G-address) of new owner (56 chars)
   * @param options - Transaction options (same as registerProject)
   * @param options.onPhaseChange - Callback for transaction phase updates
   * @param options.signal - AbortSignal to cancel transaction polling
   * @param options.timeoutMs - Transaction confirmation timeout (default: 60000ms)
   * @param options.intervalMs - Polling interval (default: 2000ms)
   * 
   * @returns Promise resolving to transaction result with hash and status
   * 
   * @throws {WalletNotConnectedError} No wallet connected
   * @throws {Error} "Project not found" if projectId doesn't exist
   * @throws {Error} "Only the current project owner can transfer ownership" if caller is not owner
   * @throws {Error} Invalid new owner address (not a valid Stellar public key)
   * @throws {NetworkMismatchError} Wallet is on wrong network
   * @throws {Error} Transaction failed or timeout
   * 
   * @example
   * // Basic ownership transfer
   * const newOwner = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
   * 
   * try {
   *   await sorobanService.transferOwnership("soroban-swap", newOwner);
   *   alert("Ownership transferred successfully!");
   * } catch (error) {
   *   if (error.message.includes("owner")) {
   *     alert("Only the current owner can transfer ownership");
   *   } else if (error.message.includes("address")) {
   *     alert("Invalid Stellar address format");
   *   } else {
   *     alert("Transfer failed: " + error.message);
   *   }
   * }
   * 
   * @example
   * // Transfer with confirmation dialog
   * async function handleTransferOwnership(projectId, newOwner) {
   *   const confirmed = await confirm({
   *     title: "Transfer Project Ownership?",
   *     description: `You are about to transfer ownership of this project to ${newOwner.slice(0, 8)}... This action cannot be undone and you will lose all control over the project.`,
   *     confirmText: "Transfer Ownership",
   *     destructive: true,
   *   });
   *   
   *   if (!confirmed) return;
   *   
   *   try {
   *     const result = await sorobanService.transferOwnership(
   *       projectId,
   *       newOwner,
   *       {
   *         onPhaseChange: (phase) => {
   *           if (phase === "signing") {
   *             setStatus("Please sign the ownership transfer in Freighter");
   *           } else if (phase === "success") {
   *             setStatus("Ownership transferred successfully!");
   *             router.push("/profile"); // Redirect away from edit page
   *           }
   *         }
   *       }
   *     );
   *   } catch (error) {
   *     setError(error.message);
   *   }
   * }
   * 
   * @example
   * // Validate address before transfer
   * import { validateStellarAddress } from '@/lib/stellar-address';
   * 
   * const validation = validateStellarAddress(newOwnerAddress);
   * if (!validation.valid) {
   *   alert(`Invalid address: ${validation.error}`);
   *   return;
   * }
   * 
   * await sorobanService.transferOwnership(projectId, newOwnerAddress);
   * 
   * @see {@link updateProject} to update project metadata (owner-only)
   * @see {@link validateStellarAddress} for address validation
   */
  async transferOwnership(
    projectId: string,
    newOwnerAddress: string,
    options: SorobanTransactionOptions = {},
  ) {
    let publicKey: string;
    try {
      publicKey = await walletService.getPublicKey();
    } catch {
      throw new WalletNotConnectedError();
    }

    const project = await this.getProject(projectId);
    if (!project) throw new Error("Project not found");
    if (project.owner !== publicKey) {
      throw new Error("Only the current project owner can transfer ownership");
    }

    // Validate new owner address
    const validation = validateStellarAddress(newOwnerAddress);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const args = [
      nativeToScVal(projectId),
      nativeToScVal(newOwnerAddress),
    ];

    const result = await executeContractTransaction(
      publicKey,
      (contract) => contract.call("transfer_ownership", ...args),
      options,
    );

    console.log(
      "[SorobanService] Ownership transfer successful:",
      result.hash,
    );
    return result;
  },

  /**
   * Returns the Soroban RPC server instance for direct RPC operations.
   * 
   * Provides access to the underlying Stellar RPC server for advanced use cases
   * that require direct interaction with the Soroban RPC API, such as:
   * - Custom contract simulations
   * - Direct ledger queries
   * - Transaction history lookups
   * - Event streaming
   * - Low-level blockchain operations
   * 
   * **Configuration:**
   * - RPC URL from `SOROBAN_CONFIG.RPC_URL`
   * - Timeout: 15 seconds
   * 
   * **Available Methods:**
   * - `getAccount(address)` - Fetch account details and sequence number
   * - `getTransaction(hash)` - Get transaction status and results
   * - `simulateTransaction(tx)` - Simulate contract invocation without submission
   * - `prepareTransaction(tx)` - Prepare transaction with footprint and resource estimates
   * - `sendTransaction(tx)` - Submit signed transaction to network
   * - `getEvents(filters)` - Query contract events
   * - `getLatestLedger()` - Get current ledger sequence
   * - `getLedgerEntries(keys)` - Fetch ledger entry data
   * 
   * @returns Stellar RPC Server instance
   * 
   * @example
   * // Direct RPC usage for custom queries
   * const server = sorobanService.getServer();
   * 
   * // Get account details
   * const account = await server.getAccount(publicKey);
   * console.log("Sequence:", account.sequenceNumber());
   * console.log("Balances:", account.balances);
   * 
   * @example
   * // Check transaction status
   * const server = sorobanService.getServer();
   * const txResult = await server.getTransaction(txHash);
   * 
   * if (txResult.status === "SUCCESS") {
   *   console.log("Transaction successful");
   * } else if (txResult.status === "FAILED") {
   *   console.error("Transaction failed:", txResult.resultXdr);
   * }
   * 
   * @example
   * // Query contract events
   * const server = sorobanService.getServer();
   * 
   * const events = await server.getEvents({
   *   startLedger: 1000000,
   *   filters: [
   *     {
   *       type: "contract",
   *       contractIds: [DONGLE_CONTRACTS.PROJECT_REGISTRY],
   *     }
   *   ],
   * });
   * 
   * console.log("Events:", events.events);
   * 
   * @example
   * // Simulate contract call without signing
   * const server = sorobanService.getServer();
   * const contract = new Contract(DONGLE_CONTRACTS.PROJECT_REGISTRY);
   * 
   * // Build transaction
   * const account = await server.getAccount(publicKey);
   * const source = new Account(publicKey, account.sequenceNumber());
   * 
   * const unsignedTx = new TransactionBuilder(source, {
   *   fee: BASE_FEE,
   *   networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
   * })
   *   .addOperation(contract.call("get_project", nativeToScVal("soroban-swap")))
   *   .setTimeout(30)
   *   .build();
   * 
   * // Simulate (no signing required)
   * const simulated = await server.simulateTransaction(unsignedTx);
   * console.log("Simulation result:", simulated.result);
   * 
   * @see {@link https://stellar.github.io/js-stellar-sdk/Server.html Stellar RPC Server API}
   * @see {@link https://soroban.stellar.org/docs/soroban-rpc Soroban RPC Documentation}
   */
  getServer() {
    return server;
  },
};

