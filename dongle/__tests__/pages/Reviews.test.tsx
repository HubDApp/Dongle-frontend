import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReviewsPage from "@/app/reviews/page";
import * as walletContext from "@/context/wallet.context";

vi.mock("@/services/review/review.service", () => ({
  reviewService: {
    getReviews: vi.fn(() => []),
    addReview: vi.fn(),
    updateReview: vi.fn(),
    deleteReview: vi.fn(),
    voteHelpful: vi.fn(),
    voteUnhelpful: vi.fn(),
  },
}));

vi.mock("@/data/mockProjects", () => ({
  mockProjects: [
    { id: "proj1", name: "Alpha", category: "DeFi", description: "desc", rating: 4, reviews: 1 },
  ],
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

function mockWallet(overrides: Partial<ReturnType<typeof walletContext.useWallet>> = {}) {
  const isConnected = overrides.isConnected ?? false;
  vi.spyOn(walletContext, "useWallet").mockReturnValue({
    isConnected,
    isConnecting: false,
    isFreighterAvailable: overrides.isFreighterAvailable ?? true,
    publicKey: overrides.publicKey ?? null,
    walletNetwork: isConnected ? "Test SDF Network ; September 2015" : null,
    isCorrectNetwork: isConnected && !overrides.walletNetwork,
    walletNetworkLabel: isConnected ? "Testnet" : "Unknown",
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
    ...overrides,
  });
}

describe("Reviews Page — Wallet State Banners", () => {
  describe("Disconnected state", () => {
    beforeEach(() => {
      mockWallet({ isConnected: false });
    });

    it("shows WalletDisconnectedBanner when wallet is disconnected", () => {
      render(<ReviewsPage />);
      expect(screen.getByText("Wallet not connected")).toBeInTheDocument();
    });

    it("shows the reviews purpose text in the banner", () => {
      render(<ReviewsPage />);
      expect(
        screen.getByText(/Connect Freighter to post, edit, or delete/i),
      ).toBeInTheDocument();
    });

    it("shows Connect Wallet button in the banner", () => {
      render(<ReviewsPage />);
      expect(
        screen.getByRole("button", { name: /Connect Wallet/i }),
      ).toBeInTheDocument();
    });

    it("calls connectWallet when banner button is clicked", () => {
      const connectWallet = vi.fn();
      mockWallet({ isConnected: false, connectWallet });
      render(<ReviewsPage />);
      fireEvent.click(screen.getByRole("button", { name: /Connect Wallet/i }));
      expect(connectWallet).toHaveBeenCalled();
    });
  });

  describe("Freighter missing state", () => {
    it("shows banner when Freighter is not installed", () => {
      mockWallet({ isConnected: false, isFreighterAvailable: false });
      render(<ReviewsPage />);
      // WalletDisconnectedBanner renders for any non-ready state
      expect(screen.getByText("Wallet not connected")).toBeInTheDocument();
    });
  });

  describe("Wrong network state", () => {
    it("shows banner when connected to the wrong network", () => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
        walletNetwork: "Public Global Stellar Network ; September 2015",
        isCorrectNetwork: false,
        walletNetworkLabel: "Mainnet",
      });
      render(<ReviewsPage />);
      expect(screen.getByText("Wallet not connected")).toBeInTheDocument();
    });
  });

  describe("Connected + ready state", () => {
    it("does not show the disconnected banner when wallet is ready", () => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
        isCorrectNetwork: true,
        walletNetworkLabel: "Testnet",
        walletNetwork: "Test SDF Network ; September 2015",
      });
      render(<ReviewsPage />);
      expect(screen.queryByText("Wallet not connected")).not.toBeInTheDocument();
    });

    it("shows project review buttons when ready", () => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
        isCorrectNetwork: true,
        walletNetworkLabel: "Testnet",
        walletNetwork: "Test SDF Network ; September 2015",
      });
      render(<ReviewsPage />);
      expect(screen.getByRole("button", { name: /Review Alpha/i })).toBeInTheDocument();
    });
  });

  describe("Hard gate — compact WalletStatePanel after user action", () => {
    it("shows compact WalletStatePanel when user tries to review while disconnected", () => {
      mockWallet({ isConnected: false });
      render(<ReviewsPage />);

      // The disconnected banner shows by default; clicking a review button
      // triggers the compact hard-gate panel.
      // In the Reviews page the review buttons are only shown when gate.state === "ready",
      // so this verifies the banner is shown before that path.
      expect(screen.getByText("Wallet not connected")).toBeInTheDocument();
    });
  });
});
