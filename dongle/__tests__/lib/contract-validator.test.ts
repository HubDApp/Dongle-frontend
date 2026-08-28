import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkContractExists,
  validateContractExists,
  ContractNotFoundError,
  _clearValidationCache,
  _validationCacheSize,
} from "@/lib/contract-validator";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_CONTRACT = "CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const ANOTHER_CONTRACT = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const RPC_URL = "https://soroban-testnet.stellar.org:443";

// ─── Mock stellar-sdk ─────────────────────────────────────────────────────────

const mockGetLedgerEntries = vi.fn();

vi.mock("stellar-sdk", () => {
  class MockContract {
    private id: string;
    constructor(id: string) {
      this.id = id;
    }
    getFootprint() {
      // Return a fake ledger key object — the validator passes this straight
      // through to getLedgerEntries, so the content doesn't matter in tests.
      return { contractId: this.id, _type: "MockLedgerKey" };
    }
  }

  return {
    rpc: {
      Server: function (_url: string) {
        return {
          getLedgerEntries: mockGetLedgerEntries,
        };
      },
    },
    Contract: MockContract,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simulates a successful RPC response (contract present). */
function mockContractExists() {
  mockGetLedgerEntries.mockResolvedValue({
    entries: [{ val: "some-entry" }],
    latestLedger: 12345,
  });
}

/** Simulates a 404-style rejection (contract not deployed). */
function mockContractNotFound() {
  mockGetLedgerEntries.mockRejectedValue({ code: 404, message: "Contract data not found." });
}

/** Simulates an empty-entries response (also means not found). */
function mockEmptyEntries() {
  mockGetLedgerEntries.mockResolvedValue({ entries: [], latestLedger: 12345 });
}

/** Simulates a transient network error (not a 404). */
function mockNetworkError(message = "ECONNREFUSED") {
  mockGetLedgerEntries.mockRejectedValue(new Error(message));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ContractNotFoundError", () => {
  it("is an instance of Error", () => {
    const err = new ContractNotFoundError(VALID_CONTRACT, RPC_URL);
    expect(err).toBeInstanceOf(Error);
  });

  it("has the correct name", () => {
    const err = new ContractNotFoundError(VALID_CONTRACT, RPC_URL);
    expect(err.name).toBe("ContractNotFoundError");
  });

  it("exposes contractId", () => {
    const err = new ContractNotFoundError(VALID_CONTRACT, RPC_URL);
    expect(err.contractId).toBe(VALID_CONTRACT);
  });

  it("exposes rpcUrl", () => {
    const err = new ContractNotFoundError(VALID_CONTRACT, RPC_URL);
    expect(err.rpcUrl).toBe(RPC_URL);
  });

  it("message mentions the contract ID", () => {
    const err = new ContractNotFoundError(VALID_CONTRACT, RPC_URL);
    expect(err.message).toContain(VALID_CONTRACT);
  });

  it("message mentions the RPC URL", () => {
    const err = new ContractNotFoundError(VALID_CONTRACT, RPC_URL);
    expect(err.message).toContain(RPC_URL);
  });

  it("message is actionable (mentions deployment)", () => {
    const err = new ContractNotFoundError(VALID_CONTRACT, RPC_URL);
    expect(err.message.toLowerCase()).toMatch(/deploy|network/);
  });
});

// ─── checkContractExists ──────────────────────────────────────────────────────

describe("checkContractExists — RPC success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearValidationCache();
  });

  it("returns true when getLedgerEntries returns a non-empty entries list", async () => {
    mockContractExists();
    const result = await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(result).toBe(true);
  });

  it("calls getLedgerEntries with the contract footprint key", async () => {
    mockContractExists();
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);
    // The mock footprint object contains the contractId
    const callArg = mockGetLedgerEntries.mock.calls[0][0];
    expect(callArg).toMatchObject({ contractId: VALID_CONTRACT });
  });

  it("returns false when getLedgerEntries returns an empty entries list", async () => {
    mockEmptyEntries();
    const result = await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(result).toBe(false);
  });
});

// ─── checkContractExists — not-found path ─────────────────────────────────────

describe("checkContractExists — not-found paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearValidationCache();
  });

  it("returns false on { code: 404 } rejection (plain-object stellar-sdk style)", async () => {
    mockContractNotFound();
    const result = await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(result).toBe(false);
  });

  it("returns false on Error with 'not found' in message", async () => {
    mockGetLedgerEntries.mockRejectedValue(new Error("entry not found"));
    const result = await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(result).toBe(false);
  });

  it("returns false on Error with 'entryNotFound' in message", async () => {
    mockGetLedgerEntries.mockRejectedValue(new Error("entryNotFound"));
    const result = await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(result).toBe(false);
  });

  it("returns false on Error with 'NOT_FOUND' in message", async () => {
    mockGetLedgerEntries.mockRejectedValue(new Error("NOT_FOUND"));
    const result = await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(result).toBe(false);
  });

  it("returns false on Error with 'contract data not found' in message", async () => {
    mockGetLedgerEntries.mockRejectedValue(new Error("Contract data not found."));
    const result = await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(result).toBe(false);
  });
});

// ─── checkContractExists — transient RPC error path ──────────────────────────

describe("checkContractExists — transient RPC error path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearValidationCache();
  });

  it("re-throws on a network error (not a 404)", async () => {
    mockNetworkError("ECONNREFUSED connect to soroban rpc");
    await expect(checkContractExists(VALID_CONTRACT, RPC_URL)).rejects.toThrow("ECONNREFUSED");
  });

  it("re-throws on a 500-level RPC error", async () => {
    mockGetLedgerEntries.mockRejectedValue(new Error("Internal server error 500"));
    await expect(checkContractExists(VALID_CONTRACT, RPC_URL)).rejects.toThrow(
      "Internal server error 500",
    );
  });

  it("does not cache the result on a transient network error", async () => {
    mockNetworkError();
    await checkContractExists(VALID_CONTRACT, RPC_URL).catch(() => {});
    // Cache should be empty — we should not have stored anything
    expect(_validationCacheSize()).toBe(0);
  });
});

// ─── checkContractExists — caching ───────────────────────────────────────────

describe("checkContractExists — caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearValidationCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("caches a 'found' result and does not call RPC on the second lookup", async () => {
    mockContractExists();
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    // getLedgerEntries should only have been called once
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);
  });

  it("caches a 'not found' result and does not call RPC on the second lookup", async () => {
    mockContractNotFound();
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);
  });

  it("returns the cached value (true) on subsequent calls", async () => {
    mockContractExists();
    const first = await checkContractExists(VALID_CONTRACT, RPC_URL);
    const second = await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(first).toBe(true);
    expect(second).toBe(true);
  });

  it("returns the cached value (false) on subsequent calls", async () => {
    mockContractNotFound();
    const first = await checkContractExists(VALID_CONTRACT, RPC_URL);
    const second = await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(first).toBe(false);
    expect(second).toBe(false);
  });

  it("caches separately for different contract IDs", async () => {
    mockContractExists();
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    await checkContractExists(ANOTHER_CONTRACT, RPC_URL);
    // Each distinct ID should trigger one RPC call
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(2);
    expect(_validationCacheSize()).toBe(2);
  });

  it("caches separately for different RPC URLs", async () => {
    const otherRpc = "https://mainnet.rpc.example.com";
    mockContractExists();
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    await checkContractExists(VALID_CONTRACT, otherRpc);
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(2);
    expect(_validationCacheSize()).toBe(2);
  });

  it("increments cache size after first call", async () => {
    mockContractExists();
    expect(_validationCacheSize()).toBe(0);
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(_validationCacheSize()).toBe(1);
  });

  it("re-queries RPC after the 1-hour cache TTL expires", async () => {
    vi.useFakeTimers();
    mockContractExists();

    await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);

    // Advance time by exactly 1 hour + 1 ms to expire the cache entry
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(2);
  });

  it("does NOT re-query RPC before the 1-hour TTL expires", async () => {
    vi.useFakeTimers();
    mockContractExists();

    await checkContractExists(VALID_CONTRACT, RPC_URL);

    // Advance by 59 minutes — still within TTL
    vi.advanceTimersByTime(59 * 60 * 1000);

    await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);
  });

  it("_clearValidationCache removes all entries", async () => {
    mockContractExists();
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(_validationCacheSize()).toBe(1);
    _clearValidationCache();
    expect(_validationCacheSize()).toBe(0);
  });

  it("after clearing cache, next call hits RPC again", async () => {
    mockContractExists();
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    _clearValidationCache();
    await checkContractExists(VALID_CONTRACT, RPC_URL);
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(2);
  });
});

// ─── validateContractExists ───────────────────────────────────────────────────

describe("validateContractExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearValidationCache();
  });

  it("resolves (does not throw) when the contract exists", async () => {
    mockContractExists();
    await expect(validateContractExists(VALID_CONTRACT, RPC_URL)).resolves.toBeUndefined();
  });

  it("throws ContractNotFoundError when the contract is not found (404 rejection)", async () => {
    mockContractNotFound();
    await expect(validateContractExists(VALID_CONTRACT, RPC_URL)).rejects.toThrow(
      ContractNotFoundError,
    );
  });

  it("throws ContractNotFoundError when the contract is not found (empty entries)", async () => {
    mockEmptyEntries();
    await expect(validateContractExists(VALID_CONTRACT, RPC_URL)).rejects.toThrow(
      ContractNotFoundError,
    );
  });

  it("the thrown ContractNotFoundError carries the correct contractId", async () => {
    mockContractNotFound();
    const err = await validateContractExists(VALID_CONTRACT, RPC_URL).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ContractNotFoundError);
    expect((err as ContractNotFoundError).contractId).toBe(VALID_CONTRACT);
  });

  it("the thrown ContractNotFoundError carries the correct rpcUrl", async () => {
    mockContractNotFound();
    const err = await validateContractExists(VALID_CONTRACT, RPC_URL).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ContractNotFoundError);
    expect((err as ContractNotFoundError).rpcUrl).toBe(RPC_URL);
  });

  it("re-throws non-404 RPC errors without wrapping them", async () => {
    mockNetworkError("ECONNREFUSED");
    await expect(validateContractExists(VALID_CONTRACT, RPC_URL)).rejects.toThrow("ECONNREFUSED");
  });

  it("the re-thrown error is NOT a ContractNotFoundError for transient failures", async () => {
    mockNetworkError();
    const err = await validateContractExists(VALID_CONTRACT, RPC_URL).catch(
      (e: unknown) => e,
    );
    expect(err).not.toBeInstanceOf(ContractNotFoundError);
  });
});

// ─── re-exports from constants/contracts ─────────────────────────────────────

describe("re-exports from constants/contracts.ts", () => {
  it("ContractNotFoundError is re-exported from constants/contracts", async () => {
    const { ContractNotFoundError: ReExported } = await import("@/constants/contracts");
    expect(ReExported).toBe(ContractNotFoundError);
  });

  it("validateContractExists is re-exported from constants/contracts", async () => {
    const { validateContractExists: reExported } = await import("@/constants/contracts");
    expect(typeof reExported).toBe("function");
  });
});
