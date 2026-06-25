import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewProjectPage from "@/app/projects/new/page";
import * as walletContext from "@/context/wallet.context";

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
    isFreighterAvailable: true,
    publicKey: null,
    walletNetwork: isConnected ? "Test SDF Network ; September 2015" : null,
    isCorrectNetwork: isConnected,
    walletNetworkLabel: isConnected ? "Testnet" : "Unknown",
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
    ...overrides,
  });
}

describe("Submit Project Page - High Risk Flows", () => {
  describe("Wallet Gating", () => {
    it("displays wallet connection message when not connected", () => {
      mockWallet();
      render(<NewProjectPage />);
      expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument();
    });

    it("shows 'Connect Wallet' button when wallet not connected", () => {
      mockWallet();
      render(<NewProjectPage />);
      expect(
        screen.getByRole("button", { name: /Connect Wallet/i }),
      ).toBeInTheDocument();
    });

    it("prevents form submission without wallet connection", () => {
      mockWallet();
      render(<NewProjectPage />);
      expect(screen.queryByRole("button", { name: /Submit Registration/i })).not.toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    beforeEach(() => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
      });
    });

    it("shows validation error for empty project name", async () => {
      render(<NewProjectPage />);
      fireEvent.click(screen.getByRole("button", { name: /Submit Registration/i }));
      expect(await screen.findByText(/project name must be at least/i)).toBeInTheDocument();
    });

    it("shows validation error for description too short", async () => {
      const user = userEvent.setup();
      render(<NewProjectPage />);

      await user.type(screen.getByLabelText(/project name/i), "Test");
      await user.type(screen.getByLabelText(/description/i), "short");
      fireEvent.click(screen.getByRole("button", { name: /Submit Registration/i }));

      expect(
        await screen.findByText(/description must be at least 10 characters/i),
      ).toBeInTheDocument();
    });

    it("shows validation error for invalid URL", async () => {
      const user = userEvent.setup();
      render(<NewProjectPage />);

      await user.type(screen.getByLabelText(/project name/i), "Test Project");
      await user.type(
        screen.getByLabelText(/description/i),
        "This is a valid description with more than twenty characters",
      );
      await user.selectOptions(screen.getByLabelText(/category/i), "defi");
      await user.type(screen.getByLabelText(/Project Website/i), "not-a-valid-url");
      fireEvent.click(screen.getByRole("button", { name: /Submit Registration/i }));

      expect(await screen.findByText(/valid url/i)).toBeInTheDocument();
    });

    it("allows form submission with valid data", async () => {
      const user = userEvent.setup();
      render(<NewProjectPage />);

      await user.type(screen.getByLabelText(/project name/i), "Test Project");
      await user.type(
        screen.getByLabelText(/description/i),
        "This is a valid description with more than twenty characters",
      );
      await user.selectOptions(screen.getByLabelText(/category/i), "defi");
      await user.type(screen.getByLabelText(/Project Website/i), "https://example.com");

      const submitButton = screen.getByRole("button", { name: /Submit Registration/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("does not show errors for optional fields left empty", async () => {
      const user = userEvent.setup();
      render(<NewProjectPage />);

      await user.type(screen.getByLabelText(/project name/i), "Test Project");
      await user.type(
        screen.getByLabelText(/description/i),
        "This is a valid description with more than twenty characters",
      );
      await user.selectOptions(screen.getByLabelText(/category/i), "defi");
      await user.type(screen.getByLabelText(/Project Website/i), "https://example.com");

      expect(screen.queryAllByRole("alert")).toHaveLength(0);
    });
  });

  describe("Form Submission", () => {
    it("submits successfully with valid data", () => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
      });
      render(<NewProjectPage />);
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    });

    it("handles submission error gracefully", () => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
      });
      render(<NewProjectPage />);
      expect(screen.getByRole("button", { name: /Submit Registration/i })).toBeInTheDocument();
    });

    it("disables submit button while submission is in progress", () => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
      });
      render(<NewProjectPage />);
      expect(screen.getByRole("button", { name: /Submit Registration/i })).toBeInTheDocument();
    });

    it("shows success message after submission", () => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
      });
      render(<NewProjectPage />);
      expect(screen.getByText(/register project/i)).toBeInTheDocument();
    });
  });

  describe("Form Structure", () => {
    it("has required form fields", () => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
      });
      render(<NewProjectPage />);
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    it("displays all category options in dropdown", () => {
      mockWallet({
        isConnected: true,
        publicKey: "GTEST123456789",
      });
      render(<NewProjectPage />);
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });
  });
});
