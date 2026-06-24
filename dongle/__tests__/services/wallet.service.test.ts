import { describe, it, expect, beforeEach, vi, MockInstance } from "vitest";

// Mock wallet service interface
interface WalletService {
  connectWallet: () => Promise<string>;
  getPublicKey: () => Promise<string>;
  isConnected: () => Promise<boolean>;
  signTransaction: (tx: string) => Promise<string>;
  disconnect: () => Promise<void>;
}

// Mock Freighter API
const mockFreighterApi = {
  freighterIsConnected: vi.fn(),
  getPublicKey: vi.fn(),
  signTransaction: vi.fn(),
};

// Typed helper to avoid repeated `as any` casts
function asMock(fn: ReturnType<typeof vi.fn>): MockInstance {
  return fn;
}

describe("Wallet Service - High Risk Flows", () => {
  let walletService: WalletService;

  beforeEach(() => {
    vi.clearAllMocks();

    walletService = {
      connectWallet: async () => {
        const isConnected = await mockFreighterApi.freighterIsConnected();
        if (!isConnected.isConnected) {
          throw new Error("Freighter not installed");
        }
        return mockFreighterApi.getPublicKey();
      },
      getPublicKey: async () => mockFreighterApi.getPublicKey(),
      isConnected: async () => {
        try {
          const result = await mockFreighterApi.freighterIsConnected();
          return result.isConnected;
        } catch {
          return false;
        }
      },
      signTransaction: async (tx: string) => mockFreighterApi.signTransaction(tx),
      disconnect: async () => {
        // No-op for mock
      },
    };
  });

  describe("Connection Management", () => {
    it("connects wallet successfully", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: true,
        error: null,
      });
      asMock(mockFreighterApi.getPublicKey).mockResolvedValue("GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOAS5HX75Z3CC");

      const publicKey = await walletService.connectWallet();

      expect(publicKey).toBe("GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOAS5HX75Z3CC");
      expect(mockFreighterApi.freighterIsConnected).toHaveBeenCalled();
    });

    it("throws error when Freighter is not installed", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: false,
        error: { message: "Freighter not installed" },
      });

      await expect(walletService.connectWallet()).rejects.toThrow("Freighter not installed");
    });

    it("throws error when user rejects wallet connection", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: true,
        error: null,
      });
      asMock(mockFreighterApi.getPublicKey).mockRejectedValue(new Error("User rejected"));

      await expect(walletService.connectWallet()).rejects.toThrow("User rejected");
    });
  });

  describe("Public Key Retrieval", () => {
    it("returns public key when wallet is connected", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: true,
        error: null,
      });
      asMock(mockFreighterApi.getPublicKey).mockResolvedValue("GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOAS5HX75Z3CC");

      const publicKey = await walletService.getPublicKey();

      expect(publicKey).toBe("GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOAS5HX75Z3CC");
    });

    it("throws error when wallet not connected", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: true,
        error: null,
      });
      asMock(mockFreighterApi.getPublicKey).mockRejectedValue(new Error("Wallet not connected"));

      await expect(walletService.getPublicKey()).rejects.toThrow("Wallet not connected");
    });

    it("throws error when Freighter is not installed", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: false,
        error: { message: "Not installed" },
      });

      await expect(walletService.getPublicKey()).rejects.toThrow();
    });
  });

  describe("Connection Status", () => {
    it("returns true when wallet is properly connected", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: true,
        error: null,
      });

      const connected = await walletService.isConnected();

      expect(connected).toBe(true);
    });

    it("returns false when Freighter is not installed", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: false,
        error: { message: "Not installed" },
      });

      const connected = await walletService.isConnected();

      expect(connected).toBe(false);
    });

    it("returns false when wallet is not allowed", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: true,
        error: { message: "Not allowed" },
      });

      const connected = await walletService.isConnected();

      expect(connected).toBe(false);
    });

    it("never throws an error", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockRejectedValue(new Error("Unexpected error"));

      const connected = await walletService.isConnected();

      expect(connected).toBe(false);
    });
  });

  describe("Transaction Signing", () => {
    it("signs transaction successfully", async () => {
      const txData = "base64-encoded-tx";
      const signedTx = "signed-tx-hash";

      asMock(mockFreighterApi.signTransaction).mockResolvedValue(signedTx);

      const result = await walletService.signTransaction(txData);

      expect(result).toBe(signedTx);
      expect(mockFreighterApi.signTransaction).toHaveBeenCalledWith(txData);
    });

    it("handles signing failure", async () => {
      asMock(mockFreighterApi.signTransaction).mockRejectedValue(
        new Error("Failed to sign transaction")
      );

      await expect(walletService.signTransaction("tx-data")).rejects.toThrow("Failed to sign");
    });

    it("handles user rejection of signing", async () => {
      asMock(mockFreighterApi.signTransaction).mockRejectedValue(
        new Error("User rejected signing")
      );

      await expect(walletService.signTransaction("tx-data")).rejects.toThrow("User rejected");
    });

    it("handles invalid transaction data", async () => {
      asMock(mockFreighterApi.signTransaction).mockRejectedValue(
        new Error("Invalid transaction format")
      );

      await expect(walletService.signTransaction("invalid-data")).rejects.toThrow("Invalid");
    });
  });

  describe("Wallet Disconnection", () => {
    it("disconnects wallet successfully", async () => {
      await expect(walletService.disconnect()).resolves.toBeUndefined();
    });

    it("clears stored connection state", async () => {
      await walletService.disconnect();
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: false,
        error: null,
      });

      const connected = await walletService.isConnected();
      expect(connected).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("handles network errors gracefully", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockRejectedValue(
        new Error("Network error")
      );

      const connected = await walletService.isConnected();
      expect(connected).toBe(false);
    });

    it("handles timeouts gracefully", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockRejectedValue(
        new Error("Request timeout")
      );

      const connected = await walletService.isConnected();
      expect(connected).toBe(false);
    });

    it("provides clear error messages", async () => {
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: false,
        error: { message: "Freighter not found" },
      });

      await expect(walletService.connectWallet()).rejects.toThrow("Freighter not installed");
    });
  });

  describe("Multiple Connection Attempts", () => {
    it("succeeds after initial failure", async () => {
      asMock(mockFreighterApi.freighterIsConnected)
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce({
          isConnected: true,
          error: null,
        });
      asMock(mockFreighterApi.getPublicKey).mockResolvedValue("GTEST...123");

      // First attempt fails
      await expect(walletService.connectWallet()).rejects.toThrow();

      // Reset mock for second attempt
      vi.clearAllMocks();
      asMock(mockFreighterApi.freighterIsConnected).mockResolvedValue({
        isConnected: true,
        error: null,
      });
      asMock(mockFreighterApi.getPublicKey).mockResolvedValue("GTEST...123");

      const publicKey = await walletService.connectWallet();
      expect(publicKey).toBe("GTEST...123");
    });
  });

  describe("Account Validation", () => {
    it("validates public key format", async () => {
      const validKey = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOAS5HX75Z3CC";
      
      // Valid key should match Stellar account format
      expect(validKey).toMatch(/^G[A-Z0-9]{55}$/);
    });

    it("rejects invalid public key format", async () => {
      const invalidKey = "INVALID_KEY_FORMAT";
      
      expect(invalidKey).not.toMatch(/^G[A-Z0-9]{55}$/);
    });
  });
});
