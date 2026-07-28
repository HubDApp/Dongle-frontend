import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import WalletGate from "@/components/wallet/WalletGate";
import type { WalletPageGateResult } from "@/hooks/useWalletPageGate";

function gateWith(
  state: WalletPageGateResult["state"],
  overrides: Partial<WalletPageGateResult> = {},
): WalletPageGateResult {
  return {
    state,
    publicKey: overrides.publicKey ?? null,
    walletNetworkLabel: overrides.walletNetworkLabel ?? "Testnet",
    connectWallet: overrides.connectWallet ?? vi.fn(),
    disconnectWallet: overrides.disconnectWallet ?? vi.fn(),
    isConnecting: overrides.isConnecting ?? false,
  };
}

describe("WalletGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the gate is 'ready' (consumer owns its content)", () => {
    const { container } = render(
      <WalletGate
        gate={gateWith("ready", { publicKey: "GTEST123" })}
        pagePurpose="ignored"
      />,
    );

    // The whole subtree should be empty when gate.state === "ready".
    // Misplacing <WalletGate> outside the `if (state !== "ready")` branch
    // would otherwise silently render a blank page.
    expect(container.firstChild).toBeNull();
  });

  it("renders the disconnected panel with the supplied page purpose", () => {
    render(
      <WalletGate
        gate={gateWith("disconnected")}
        pagePurpose="Custom purpose text for testing."
      />,
    );

    expect(screen.getByText("Connect Your Wallet")).toBeInTheDocument();
    expect(screen.getByText("Custom purpose text for testing.")).toBeInTheDocument();
  });

  it("renders the Freighter install CTA when the extension is missing", () => {
    render(
      <WalletGate
        gate={gateWith("freighter-missing")}
        pagePurpose="Connect to continue."
      />,
    );

    expect(screen.getByText("Install Freighter Wallet")).toBeInTheDocument();
  });

  it("renders wrong-network guidance with the wallet's current network label", () => {
    render(
      <WalletGate
        gate={gateWith("wrong-network", { walletNetworkLabel: "Mainnet" })}
        pagePurpose="ignored"
      />,
    );

    expect(screen.getByText(/Mainnet/)).toBeInTheDocument();
  });

  it("renders a Friendbot link when the account is not funded and a publicKey is available", () => {
    render(
      <WalletGate
        gate={gateWith("account-not-funded", { publicKey: "GTEST123" })}
        pagePurpose="ignored"
      />,
    );

    expect(screen.getByText("Fund Your Testnet Account")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Fund with Friendbot/i });
    expect(link.getAttribute("href")).toContain("friendbot.stellar.org");
    expect(link.getAttribute("href")).toContain("GTEST123");
  });

  it("renders only the Disconnect Wallet action when 'account-not-funded' but no publicKey", () => {
    const disconnectWallet = vi.fn();
    render(
      <WalletGate
        gate={gateWith("account-not-funded", {
          publicKey: null,
          disconnectWallet,
        })}
        pagePurpose="ignored"
      />,
    );

    expect(screen.getByText("Fund Your Testnet Account")).toBeInTheDocument();

    // No Friendbot link is possible without a publicKey.
    expect(
      screen.queryByRole("link", { name: /Fund with Friendbot/i }),
    ).not.toBeInTheDocument();

    // The Disconnect Wallet action still wires through to gate.disconnectWallet.
    screen.getByRole("button", { name: /Disconnect Wallet/i }).click();
    expect(disconnectWallet).toHaveBeenCalledOnce();
  });

  it("shows the loading panel with the supplied message while the account loads", () => {
    render(
      <WalletGate
        gate={gateWith("account-loading")}
        pagePurpose="ignored"
        loadingMessage="Custom loading message"
      />,
    );

    expect(screen.getByText("Custom loading message")).toBeInTheDocument();
  });

  it("uses the default loading message when none is provided", () => {
    render(
      <WalletGate
        gate={gateWith("account-loading")}
        pagePurpose="ignored"
      />,
    );

    expect(screen.getByText("Loading wallet data...")).toBeInTheDocument();
  });

  it("renders compact when requested (smaller padding)", () => {
    const { container } = render(
      <WalletGate
        gate={gateWith("disconnected", { walletNetworkLabel: "Mainnet" })}
        pagePurpose="ignored"
        compact
      />,
    );

    // compact panels use py-12 px-6 instead of py-24 px-8
    const panel = container.querySelector('[role="status"]');
    expect(panel?.className).toContain("py-12");
  });

  it("forwards className to the panel without adding wrapper divs", () => {
    const { container } = render(
      <WalletGate
        gate={gateWith("disconnected")}
        pagePurpose="ignored"
        className="my-custom-spacing"
      />,
    );

    const panel = container.querySelector('[role="status"]');
    expect(panel?.className).toContain("my-custom-spacing");
    // No extra wrapper div
    expect(container.firstElementChild).toBe(panel);
  });

  it("calls connectWallet when the connect button is clicked in the disconnected state", () => {
    const connectWallet = vi.fn();
    render(
      <WalletGate
        gate={gateWith("disconnected", { connectWallet })}
        pagePurpose="ignored"
      />,
    );

    screen.getByRole("button", { name: /Connect Wallet/i }).click();
    expect(connectWallet).toHaveBeenCalledOnce();
  });
});
