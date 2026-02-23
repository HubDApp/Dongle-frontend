import {
  getAddress,
  isAllowed,
  isConnected as freighterIsConnected,
  requestAccess,
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

  // Freighter has no disconnect API — context handles clearing state on its end
  disconnectWallet(): void {},
};
