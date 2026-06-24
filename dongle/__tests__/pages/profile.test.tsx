import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfilePage from "@/app/profile/page";
import * as walletContext from "@/context/wallet.context";
import { useStellarAccount } from "@/hooks/useStellarAccount";
import { reviewService } from "@/services/review/review.service";
import { projectService } from "@/services/project/project.service";

// Mock the hooks and services
vi.mock("@/hooks/useStellarAccount", () => ({
  useStellarAccount: vi.fn(),
}));

vi.mock("@/services/review/review.service", () => ({
  reviewService: {
    getReviewsByUser: vi.fn(),
  },
}));

vi.mock("@/services/project/project.service", () => ({
  projectService: {
    getAllProjects: vi.fn(),
  },
}));

vi.mock("@/components/layout/LayoutWrapper", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("Profile Page", () => {
  describe("Disconnected State", () => {
    it("should show connect wallet prompt when not connected", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: null,
        isConnected: false,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText("Connect Your Wallet")).toBeInTheDocument();
      expect(screen.getByText(/Connect your Stellar wallet/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Connect Wallet/ })).toBeInTheDocument();
    });

    it("should call connectWallet when button is clicked", () => {
      const connectWallet = vi.fn();
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: null,
        isConnected: false,
        isConnecting: false,
        connectWallet,
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      const button = screen.getByRole("button", { name: /Connect Wallet/ });
      fireEvent.click(button);

      expect(connectWallet).toHaveBeenCalled();
    });
  });

  describe("Connected State", () => {
    beforeEach(() => {
      vi.mocked(useStellarAccount).mockReturnValue({
        account: {
          id: "test-account",
          account_id: "GTEST123",
          balances: [],
        },
        balances: [
          {
            balance: "100.0000000",
            asset_type: "native",
          },
        ],
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.mocked(reviewService.getReviewsByUser).mockReturnValue([
        {
          id: "review1",
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: "GTEST123",
          rating: 5,
          comment: "Great project with excellent features",
          createdAt: "2025-06-01T00:00:00Z",
        },
      ]);

      vi.mocked(projectService.getAllProjects).mockReturnValue([
        {
          id: "proj1",
          name: "Test Project",
          category: "DeFi",
          description: "A test project",
          rating: 4.5,
          reviews: 10,
          createdAt: "2025-01-01T00:00:00Z",
        },
      ]);
    });

    it("should display wallet address when connected", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText(/GTEST123456789/)).toBeInTheDocument();
    });

    it("should display user balances", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText("Lumens (XLM)")).toBeInTheDocument();
      expect(screen.getByText("100.00")).toBeInTheDocument();
    });

    it("should display user reviews", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText("Test Project")).toBeInTheDocument();
      expect(screen.getByText(/Great project with excellent features/)).toBeInTheDocument();
    });

    it("should show review count badge", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText("1")).toBeInTheDocument(); // Review count
    });

    it("should calculate average rating", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText("5.0")).toBeInTheDocument(); // Average rating
    });

    it("should show disconnect button", () => {
      const disconnectWallet = vi.fn();
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet,
      });

      render(<ProfilePage />);

      const button = screen.getByRole("button", { name: /Disconnect/ });
      fireEvent.click(button);

      expect(disconnectWallet).toHaveBeenCalled();
    });

    it("should copy address to clipboard", async () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");

      render(<ProfilePage />);

      const copyButton = screen.getByTitle("Copy address");
      fireEvent.click(copyButton);

      expect(clipboardSpy).toHaveBeenCalledWith("GTEST123456789");
    });
  });

  describe("Loading State", () => {
    it("should show loading spinner while fetching account data", () => {
      vi.mocked(useStellarAccount).mockReturnValue({
        account: null,
        balances: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText(/Loading your profile/)).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should show error message when account fetch fails", () => {
      vi.mocked(useStellarAccount).mockReturnValue({
        account: null,
        balances: null,
        loading: false,
        error: "Account not found on testnet",
        refetch: vi.fn(),
      });

      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText("Account Not Found")).toBeInTheDocument();
      expect(screen.getByText("Account not found on testnet")).toBeInTheDocument();
    });

    it("should show disconnect button in error state", () => {
      const disconnectWallet = vi.fn();

      vi.mocked(useStellarAccount).mockReturnValue({
        account: null,
        balances: null,
        loading: false,
        error: "Account not found",
        refetch: vi.fn(),
      });

      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet,
      });

      render(<ProfilePage />);

      const button = screen.getByRole("button", { name: /Disconnect Wallet/ });
      fireEvent.click(button);

      expect(disconnectWallet).toHaveBeenCalled();
    });
  });

  describe("Empty Reviews State", () => {
    it("should show empty state when user has no reviews", () => {
      vi.mocked(useStellarAccount).mockReturnValue({
        account: { id: "test" },
        balances: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.mocked(reviewService.getReviewsByUser).mockReturnValue([]);

      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        publicKey: "GTEST123456789",
        isConnected: true,
        isConnecting: false,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
      expect(screen.getByText(/Start reviewing projects/)).toBeInTheDocument();
    });
  });
});
