import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NetworkMismatchBanner from "@/components/layout/NetworkMismatchBanner";
import * as walletContext from "@/context/wallet.context";

describe("NetworkMismatchBanner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is hidden when the wallet is disconnected", () => {
    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      publicKey: null,
      isConnected: false,
      isConnecting: false,
      isFreighterAvailable: true,
      walletNetwork: null,
      isCorrectNetwork: false,
      walletNetworkLabel: "Unknown",
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
    });

    const { container } = render(<NetworkMismatchBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is hidden when the wallet is on the expected network", () => {
    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      publicKey: "GTEST",
      isConnected: true,
      isConnecting: false,
      isFreighterAvailable: true,
      walletNetwork: "Test SDF Network ; September 2015",
      isCorrectNetwork: true,
      walletNetworkLabel: "Testnet",
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
    });

    const { container } = render(<NetworkMismatchBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows clear switch instructions when the wallet is on the wrong network", () => {
    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      publicKey: "GTEST",
      isConnected: true,
      isConnecting: false,
      isFreighterAvailable: true,
      walletNetwork: "Public Global Stellar Network ; September 2015",
      isCorrectNetwork: false,
      walletNetworkLabel: "Mainnet",
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
    });

    render(<NetworkMismatchBanner />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Wrong network detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Mainnet/)).toBeInTheDocument();
    expect(screen.getByText(/Settings → Network/i)).toBeInTheDocument();
  });
});
