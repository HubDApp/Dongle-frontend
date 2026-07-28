import { describe, it, expect, vi, beforeEach } from "vitest";

// Vitest mocks for stellar-sdk RPC + builders.
const mockServer = {
  getAccount: vi.fn(),
  simulateTransaction: vi.fn(),
  prepareTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
};

const mockWallet = {
  getPublicKey: vi.fn(),
  signTransaction: vi.fn(),
  getNetworkPassphrase: vi.fn(),
};

vi.mock("stellar-sdk", () => {
  class MockAccount {
    publicKey: string;
    sequence: string;
    constructor(publicKey: string, sequence: string) {
      this.publicKey = publicKey;
      this.sequence = sequence;
    }
  }

  class MockContract {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
    call(method: string, ...args: unknown[]) {
      return { method, args };
    }
  }

  class MockTransactionBuilder {
    source: { publicKey: string; sequence: string };
    constructor(source: { publicKey: string; sequence: string }, _opts: Record<string, unknown>) {
      this.source = source;
    }
    addOperation(_op: Record<string, unknown>) {
      return this;
    }
    setTimeout(_t: number) {
      return this;
    }
    build() {
      // unsigned tx
      return { toXDR: () => "UNSIGNED_XDR" };
    }
    static fromXDR(xdr: string, _passphrase: string) {
      return { xdr };
    }
    toXDR() {
      return "PREPARED_XDR";
    }
  }

  return {
    rpc: {
      Server: function () {
        return mockServer;
      },
    },
    Contract: MockContract,
    TransactionBuilder: MockTransactionBuilder,
    Account: MockAccount,
    BASE_FEE: 100,
    nativeToScVal: (v: unknown) => ({ v }),
  };
});

vi.mock("@/services/wallet/wallet.service", () => {
  return {
    walletService: mockWallet,
  };
});

describe("sorobanService - no-wallet error path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate Freighter unavailable / not approved
    mockWallet.getPublicKey.mockRejectedValue(new Error("Wallet not connected"));
  });

  it("registerProject throws WalletNotConnectedError when wallet is unavailable", async () => {
    const { sorobanService, WalletNotConnectedError } = await import(
      "@/services/stellar/soroban.service"
    );

    await expect(
      sorobanService.registerProject({
        name: "My Project",
        category: "cat",
        description: "desc",
        websiteUrl: "https://example.com",
      }),
    ).rejects.toThrow(WalletNotConnectedError);
  });

  it("registerProject error message is actionable", async () => {
    const { sorobanService } = await import("@/services/stellar/soroban.service");

    const err = await sorobanService
      .registerProject({
        name: "My Project",
        category: "cat",
        description: "desc",
        websiteUrl: "https://example.com",
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Freighter");
  });

  it("registerProject never returns a mock success hash when wallet is unavailable", async () => {
    const { sorobanService } = await import("@/services/stellar/soroban.service");

    const result = await sorobanService
      .registerProject({
        name: "My Project",
        category: "cat",
        description: "desc",
        websiteUrl: "https://example.com",
      })
      .catch(() => null);

    // Must reject, never resolve with a fake hash
    expect(result).toBeNull();
    // RPC must never be touched
    expect(mockServer.prepareTransaction).not.toHaveBeenCalled();
    expect(mockServer.sendTransaction).not.toHaveBeenCalled();
  });

  it("updateProject throws WalletNotConnectedError when wallet is unavailable", async () => {
    const { sorobanService, WalletNotConnectedError } = await import(
      "@/services/stellar/soroban.service"
    );

    await expect(
      sorobanService.updateProject("proj-123", {
        name: "Updated Name",
        category: "defi",
        description: "desc",
        websiteUrl: "https://example.com",
      }),
    ).rejects.toThrow(WalletNotConnectedError);
  });

  it("updateProject never returns a mock success hash when wallet is unavailable", async () => {
    const { sorobanService } = await import("@/services/stellar/soroban.service");

    const result = await sorobanService
      .updateProject("proj-123", {
        name: "Updated Name",
        category: "defi",
        description: "desc",
        websiteUrl: "https://example.com",
      })
      .catch(() => null);

    expect(result).toBeNull();
    expect(mockServer.prepareTransaction).not.toHaveBeenCalled();
    expect(mockServer.sendTransaction).not.toHaveBeenCalled();
  });

  it("registerProject throws NetworkMismatchError when wallet is on the wrong network", async () => {
    mockWallet.getPublicKey.mockResolvedValue("GTEST...123");
    mockWallet.getNetworkPassphrase.mockResolvedValue(
      "Public Global Stellar Network ; September 2015",
    );

    const { sorobanService, NetworkMismatchError } = await import(
      "@/services/stellar/soroban.service"
    );

    await expect(
      sorobanService.registerProject({
        name: "My Project",
        category: "cat",
        description: "desc",
        websiteUrl: "https://example.com",
      }),
    ).rejects.toThrow(NetworkMismatchError);

    expect(mockWallet.signTransaction).not.toHaveBeenCalled();
    expect(mockServer.sendTransaction).not.toHaveBeenCalled();
  });
});

describe("sorobanService - sequence + simulate/prepare + polling", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockWallet.getPublicKey.mockResolvedValue("GTEST...123");
    mockWallet.signTransaction.mockResolvedValue("SIGNED_XDR");
    mockWallet.getNetworkPassphrase.mockResolvedValue(
      "Test SDF Network ; September 2015",
    );

    mockServer.getAccount.mockResolvedValue({
      sequence: "42",
      sequenceNumber: () => "42",
    });
    mockServer.simulateTransaction.mockResolvedValue({ sim: "ok" });
    mockServer.prepareTransaction.mockResolvedValue({ toXDR: () => "PREPARED_XDR" });
    mockServer.sendTransaction.mockResolvedValue({ status: "SUCCESS", hash: "TX_HASH_1" });

    // Polling succeeds immediately
    mockServer.getTransaction.mockResolvedValue({ status: "SUCCESS" });
  });

  it("registerProject uses real account sequence and runs simulate+prepare and polls with timeout", async () => {
    const { sorobanService } = await import("@/services/stellar/soroban.service");

    const res = await sorobanService.registerProject({
      name: "My Project",
      category: "cat",
      description: "desc",
      websiteUrl: "https://example.com",
      logoUrl: "https://example.com/logo.png",
      docsUrl: "https://example.com/docs",
    });

    expect(res).toEqual({ hash: "TX_HASH_1", status: "SUCCESS" });

    expect(mockServer.getAccount).toHaveBeenCalledWith("GTEST...123");
    expect(mockServer.prepareTransaction).toHaveBeenCalledTimes(1);
    expect(mockServer.sendTransaction).toHaveBeenCalledTimes(1);

    expect(mockServer.getTransaction).toHaveBeenCalled();
    expect(mockServer.getTransaction).toHaveBeenCalledTimes(1);

    // ensure signing happened using prepared XDR
    expect(mockWallet.signTransaction).toHaveBeenCalledWith(
      "PREPARED_XDR",
      expect.any(String),
    );
  });

  it("registerProject throws useful error on polling timeout", async () => {
    // always NOT_FOUND
    mockServer.getTransaction.mockResolvedValue({ status: "NOT_FOUND" });

    const { sorobanService } = await import("@/services/stellar/soroban.service");

    const clock = vi.useFakeTimers();
    const promise = sorobanService
      .registerProject({
        name: "My Project",
        category: "cat",
        description: "desc",
        websiteUrl: "https://example.com",
      })
      .catch((e) => e);

    // advance time beyond default 60s timeout (poll interval is 2s; we advance big)
    await clock.advanceTimersByTimeAsync(65_000);

    const err = await promise;
    clock.useRealTimers();

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Timeout waiting for transaction");
  });

  it("registerProject respects custom timeout options in pollTransaction", async () => {
    // always NOT_FOUND
    mockServer.getTransaction.mockResolvedValue({ status: "NOT_FOUND" });

    const { sorobanService } = await import("@/services/stellar/soroban.service");

    const clock = vi.useFakeTimers();
    const promise = sorobanService
      .registerProject(
        {
          name: "My Project",
          category: "cat",
          description: "desc",
          websiteUrl: "https://example.com",
        },
        { timeoutMs: 5000, intervalMs: 1000 }
      )
      .catch((e) => e);

    // advance time beyond custom 5s timeout (poll interval is 1s; we advance 6s)
    await clock.advanceTimersByTimeAsync(6000);

    const err = await promise;
    clock.useRealTimers();

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Timeout waiting for transaction");
  });

  it("registerProject aborts polling immediately when AbortSignal is aborted", async () => {
    mockServer.getTransaction.mockResolvedValue({ status: "NOT_FOUND" });

    const { sorobanService } = await import("@/services/stellar/soroban.service");

    const controller = new AbortController();
    const promise = sorobanService
      .registerProject(
        {
          name: "My Project",
          category: "cat",
          description: "desc",
          websiteUrl: "https://example.com",
        },
        { signal: controller.signal }
      )
      .catch((e) => e);

    // Abort the signal immediately
    controller.abort();

    const err = await promise;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Transaction polling aborted");
  });
});

