import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWallet } from "@/context/wallet.context";
import { useStellarAccount } from "@/hooks/useStellarAccount";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";

vi.mock("@/context/wallet.context");
vi.mock("@/hooks/useStellarAccount");

type WalletState = {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  walletNetworkLabel: string;
  isFreighterAvailable: boolean | null;
  connectWallet: ReturnType<typeof vi.fn>;
  disconnectWallet: ReturnType<typeof vi.fn>;
};

function mockWallet(overrides: Partial<WalletState> = {}): WalletState {
  const defaults: WalletState = {
    publicKey: overrides.publicKey ?? null,
    isConnected: overrides.isConnected ?? false,
    isConnecting: overrides.isConnecting ?? false,
    isCorrectNetwork: overrides.isCorrectNetwork ?? false,
    walletNetworkLabel: overrides.walletNetworkLabel ?? "Unknown",
    isFreighterAvailable: overrides.isFreighterAvailable ?? true,
    connectWallet: overrides.connectWallet ?? vi.fn(),
    disconnectWallet: overrides.disconnectWallet ?? vi.fn(),
  };
  vi.mocked(useWallet).mockReturnValue(defaults);
  return defaults;
}

function mockAccount(
  overrides: Partial<ReturnType<typeof useStellarAccount>> = {},
): void {
  vi.mocked(useStellarAccount).mockReturnValue({
    account: null,
    balances: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

describe("useWalletPageGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'freighter-missing' when Freighter is not installed", () => {
    mockWallet({ isFreighterAvailable: false });
    mockAccount();
    const { result } = renderHook(() => useWalletPageGate());
    expect(result.current.state).toBe("freighter-missing");
  });

  it("returns 'connecting' while a connection is in progress", () => {
    mockWallet({ isConnecting: true });
    mockAccount();
    const { result } = renderHook(() => useWalletPageGate());
    expect(result.current.state).toBe("connecting");
  });

  it("returns 'disconnected' when the wallet is not connected", () => {
    mockWallet({ isConnected: false, isFreighterAvailable: true });
    mockAccount();
    const { result } = renderHook(() => useWalletPageGate());
    expect(result.current.state).toBe("disconnected");
  });

  it("returns 'wrong-network' when connected but on the wrong network", () => {
    mockWallet({
      isConnected: true,
      isCorrectNetwork: false,
      walletNetworkLabel: "Mainnet",
      publicKey: "GTEST123",
    });
    mockAccount();
    const { result } = renderHook(() => useWalletPageGate());
    expect(result.current.state).toBe("wrong-network");
  });

  it("returns 'account-loading' when requireFundedAccount and account is loading", () => {
    mockWallet({
      isConnected: true,
      isCorrectNetwork: true,
      walletNetworkLabel: "Testnet",
      publicKey: "GTEST123",
    });
    mockAccount({ loading: true });
    const { result } = renderHook(() =>
      useWalletPageGate({ requireFundedAccount: true }),
    );
    expect(result.current.state).toBe("account-loading");
  });

  it("returns 'account-not-funded' on Horizon account-not-found error", () => {
    mockWallet({
      isConnected: true,
      isCorrectNetwork: true,
      walletNetworkLabel: "Testnet",
      publicKey: "GTEST123",
    });
    mockAccount({ error: "Account not found on Stellar Testnet" });
    const { result } = renderHook(() =>
      useWalletPageGate({ requireFundedAccount: true }),
    );
    expect(result.current.state).toBe("account-not-funded");
  });

  it("returns 'ready' when connected, on correct network, and account loads", () => {
    mockWallet({
      isConnected: true,
      isCorrectNetwork: true,
      walletNetworkLabel: "Testnet",
      publicKey: "GTEST123",
    });
    mockAccount({ loading: false, error: null });
    const { result } = renderHook(() => useWalletPageGate());
    expect(result.current.state).toBe("ready");
    expect(result.current.publicKey).toBe("GTEST123");
  });

  it("exposes connectWallet, disconnectWallet, and isConnecting from the wallet context", () => {
    const connectWallet = vi.fn();
    const disconnectWallet = vi.fn();
    mockWallet({
      isConnected: false,
      isConnecting: true,
      connectWallet,
      disconnectWallet,
    });
    mockAccount();
    const { result } = renderHook(() => useWalletPageGate());
    expect(result.current.connectWallet).toBe(connectWallet);
    expect(result.current.disconnectWallet).toBe(disconnectWallet);
    expect(result.current.isConnecting).toBe(true);
  });

  it("does not gate on account-not-funded without requireFundedAccount", () => {
    mockWallet({
      isConnected: true,
      isCorrectNetwork: true,
      walletNetworkLabel: "Testnet",
      publicKey: "GTEST123",
    });
    mockAccount({ error: "Account not found on Stellar Testnet" });
    const { result } = renderHook(() => useWalletPageGate());
    expect(result.current.state).toBe("ready");
  });

  it("respects state priority: disconnected beats account loading", () => {
    mockWallet({ isConnected: false });
    mockAccount({ loading: true });
    const { result } = renderHook(() =>
      useWalletPageGate({ requireFundedAccount: true }),
    );
    expect(result.current.state).toBe("disconnected");
  });

  it("respects state priority: freighter-missing beats account-loading under requireFundedAccount", () => {
    mockWallet({ isFreighterAvailable: false });
    mockAccount({ loading: true, error: "Account not found on Stellar Testnet" });
    const { result } = renderHook(() =>
      useWalletPageGate({ requireFundedAccount: true }),
    );
    expect(result.current.state).toBe("freighter-missing");
  });

  it("respects state priority: connecting beats wrong-network and account states", () => {
    mockWallet({
      isConnecting: true,
      isConnected: false,
      isCorrectNetwork: false,
      walletNetworkLabel: "Standalone",
    });
    mockAccount({ error: "Account not found on Stellar Testnet" });
    const { result } = renderHook(() =>
      useWalletPageGate({ requireFundedAccount: true }),
    );
    expect(result.current.state).toBe("connecting");
  });
});
