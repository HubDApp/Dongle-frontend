import {
  getAddress,
  getNetworkDetails,
  isAllowed,
  isConnected as freighterIsConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

export const walletService = {
  // Opens Freighter popup and returns the user's public key on approval
  async connectWallet(): Promise<string> {
    const { isConnected, error: connErr } = await freighterIsConnected();
    if (!isConnected || connErr) {
      throw new Error(connErr?.message ?? "Freighter is not installed");
    }

    const { address, error } = await requestAccess();
    if (!address || error) {
      throw new Error(error?.message ?? "Wallet connection failed");
    }

    console.info("Wallet connected:", address);
    return address;
  },

  // Silently reads the public key — requires prior approval, no popup
  async getPublicKey(): Promise<string> {
    const { isConnected, error: connErr } = await freighterIsConnected();
    if (!isConnected || connErr) {
      throw new Error(connErr?.message ?? "Freighter is not installed");
    }

    const { isAllowed: allowed, error: allowErr } = await isAllowed();
    if (!allowed || allowErr) {
      throw new Error(allowErr?.message ?? "Wallet not connected");
    }

    const { address, error } = await getAddress();
    if (!address || error) {
      throw new Error(error?.message ?? "Could not retrieve public key");
    }

    return address;
  },

  // Safe to call anywhere — never throws, returns false if anything is off
  async isConnected(): Promise<boolean> {
    try {
      const { isConnected } = await freighterIsConnected();
      if (!isConnected) return false;

      const { isAllowed: allowed } = await isAllowed();
      if (!allowed) return false;

      const { address } = await getAddress();
      return Boolean(address);
    } catch {
      return false;
    }
  },

  // Signs a transaction XDR with Freighter
  async signTransaction(xdr: string, networkPassphrase: string): Promise<string> {
    const { signedTxXdr, error } = await signTransaction(xdr, { networkPassphrase });
    if (error || !signedTxXdr) {
      throw new Error(error ?? "Transaction signing failed");
    }
    return signedTxXdr;
  },

  // Freighter has no disconnect API — context handles clearing state on its end
  disconnectWallet(): void {},

  /**
   * Returns the network passphrase of the wallet's currently selected network.
   * Returns null when Freighter is unavailable or not yet approved.
   */
  async getNetworkPassphrase(): Promise<string | null> {
    try {
      const { isConnected } = await freighterIsConnected();
      if (!isConnected) return null;
      const details = await getNetworkDetails();
      // Freighter ≥ 1.7 returns { networkPassphrase, network, networkUrl }
      // Older versions may return { networkPassphrase } directly.
      return (details as { networkPassphrase?: string }).networkPassphrase ?? null;
    } catch {
      return null;
    }
  },
};
