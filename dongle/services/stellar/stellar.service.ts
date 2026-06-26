import { Horizon, Networks } from "stellar-sdk";

/**
 * Configuration for the Stellar network.
 * Currently configured for Testnet.
 */
export const STELLAR_CONFIG = {
  HORIZON_URL: "https://horizon-testnet.stellar.org",
  NETWORK_PASSPHRASE: Networks.TESTNET,
};

const server = new Horizon.Server(STELLAR_CONFIG.HORIZON_URL);

/**
 * Service to handle communication with the Stellar network.
 */
export const stellarService = {
  /**
   * Fetches account details for a given public key.
   * @param publicKey The public key of the account to fetch.
   * @returns The account response from Horizon.
   */
  async getAccount(publicKey: string) {
    try {
      const account = await server.loadAccount(publicKey);
      return account;
    } catch (error) {
      console.error(`[StellarService] Error fetching account ${publicKey}:`, error);
      const err = error as { response?: { status?: number }; message?: string };
      if (err.response?.status === 404) {
        throw new Error("Account not found on Stellar Testnet. Please fund it using Friendbot.");
      }
      throw new Error(err.message || "Failed to fetch account details from Stellar network.");
    }
  },

  /**
   * Fetches balances for a given public key.
   * @param publicKey The public key of the account.
   * @returns An array of balances associated with the account.
   */
  async getBalances(publicKey: string) {
    try {
      const account = await this.getAccount(publicKey);
      return account.balances;
    } catch (error) {
      console.error(`[StellarService] Error fetching balances for ${publicKey}:`, error);
      throw error;
    }
  },

  /**
   * Fetches recent transactions for a given public key.
   * @param publicKey The public key of the account.
   * @param limit The number of transactions to retrieve (default 10).
   * @returns A collection of transaction records.
   */
  async getTransactions(publicKey: string, limit: number = 10) {
    try {
      const transactions = await server
        .transactions()
        .forAccount(publicKey)
        .limit(limit)
        .order("desc")
        .call();
      return transactions.records;
    } catch (error) {
      console.error(`[StellarService] Error fetching transactions for ${publicKey}:`, error);
      const err = error as { message?: string };
      throw new Error(err.message || "Failed to fetch transactions from Stellar network.");
    }
  },

  /**
   * Returns the Horizon server instance for advanced use cases.
   */
  getServer() {
    return server;
  },

  /**
   * Returns the current network passphrase.
   */
  getNetworkPassphrase() {
    return STELLAR_CONFIG.NETWORK_PASSPHRASE;
  },
};
