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

export interface ProjectRegistrationParams {
  name: string;
  category: string;
  description: string;
  url: string;
  logoUrl: string;
  docsUrl: string;
}

export const sorobanService = {
  /**
   * Registers a new project in the Project Registry contract.
   */
  async registerProject(params: ProjectRegistrationParams) {
    try {
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

      // 1. Fetch account sequence
      await server.getLatestLedger(); // Just to check connection

      // In a real scenario, we'd load the account from Horizon or RPC
      // For transaction building, we need the account object
      const source = new Account(publicKey, "0"); // Sequence will be filled by build process or manually

      // 2. Initialize contract
      const contract = new Contract(DONGLE_CONTRACTS.PROJECT_REGISTRY);

      // 3. Prepare arguments
      // Matching the expected contract method: register_project(name: String, category: String, description: String, url: String, logo_url: String, docs_url: String)
      const args = [
        nativeToScVal(params.name),
        nativeToScVal(params.category),
        nativeToScVal(params.description),
        nativeToScVal(params.url),
        nativeToScVal(params.logoUrl),
        nativeToScVal(params.docsUrl),
      ];

      // 4. Build transaction
      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("register_project", ...args))
        .setTimeout(30)
        .build();

      // 5. Simulate transaction (optional but recommended for Soroban)
      // Note: In a real app, you'd use the simulation result to adjust fees/footprint
      // const simulation = await server.simulateTransaction(tx);

      // 6. Sign with Freighter
      const xdrString = tx.toXDR();
      const signedXdr = await walletService.signTransaction(
        xdrString,
        SOROBAN_CONFIG.NETWORK_PASSPHRASE,
      );

      // 7. Submit to RPC
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

      // 8. Poll for status
      let getResponse = await server.getTransaction(sendResponse.hash);
      while (getResponse.status === "NOT_FOUND") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        getResponse = await server.getTransaction(sendResponse.hash);
      }

      if (getResponse.status === "SUCCESS") {
        console.log(
          "[SorobanService] Registration successful:",
          sendResponse.hash,
        );
        return {
          hash: sendResponse.hash,
          status: "SUCCESS",
        };
      } else {
        throw new Error(
          "Transaction failed with status: " + getResponse.status,
        );
      }
    } catch (error) {
      console.error("[SorobanService] Error registering project:", error);
      throw error;
    }
  },

  /**
   * Mock method to request verification for a project.
   */
  async requestVerification(projectId: string) {
    try {
      console.log(
        `[SorobanService] Requesting verification for project: ${projectId}`,
      );
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        hash:
          "mock_verification_hash_" + Math.random().toString(36).substring(7),
        status: "SUCCESS",
      };
    } catch (error) {
      console.error("[SorobanService] Error requesting verification:", error);
      throw error;
    }
  },

  /**
   * Mock method to get the verification status of a project.
   */
  async getVerificationStatus(
    projectId: string,
  ): Promise<"NONE" | "PENDING" | "VERIFIED" | "REJECTED"> {
    try {
      console.log(
        `[SorobanService] Getting verification status for: ${projectId}`,
      );
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demonstration, we can return 'PENDING' if a certain string is passed,
      // or randomly determine status. We'll return a random status for the mock,
      // but biased towards 'PENDING' for newly submitted ones.

      if (!projectId || projectId.length < 3) return "NONE";

      // Simple hash to keep it deterministic per session
      const mockStatus = parseInt(projectId, 36) % 3;
      if (mockStatus === 0) return "VERIFIED";
      if (mockStatus === 1) return "PENDING";
      return "REJECTED";
    } catch (error) {
      console.error(
        "[SorobanService] Error getting verification status:",
        error,
      );
      return "NONE";
    }
  },

  /**
   * Helper to get RPC server instance.
   */
  getServer() {
    return server;
  },
};
