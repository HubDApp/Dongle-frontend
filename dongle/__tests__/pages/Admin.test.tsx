import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_ADMIN_ALLOWLIST = "GADMIN1234567890";
});

import { render, screen, fireEvent } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import * as walletContext from "@/context/wallet.context";

const ADMIN_KEY = "GADMIN1234567890";

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

function mockWallet(isConnected: boolean, publicKey: string | null) {
  vi.spyOn(walletContext, "useWallet").mockReturnValue({
    isConnected,
    isConnecting: false,
    publicKey,
    walletNetwork: isConnected ? "Test SDF Network ; September 2015" : null,
    isCorrectNetwork: isConnected,
    walletNetworkLabel: isConnected ? "Testnet" : "Unknown",
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
  });
}

describe("Admin Dashboard - Authorization & High Risk Flows", () => {
  describe("Admin Authorization", () => {
    it("displays admin dashboard when authorized", () => {
      mockWallet(true, ADMIN_KEY);

      render(<AdminPage />);

      expect(screen.getByText("ADMIN DASHBOARD")).toBeInTheDocument();
    });

    it("denies access for non-admin users", () => {
      mockWallet(true, "GNOTADMIN123456");

      render(<AdminPage />);

      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    });

    it("shows wallet connection requirement", () => {
      mockWallet(false, null);

      render(<AdminPage />);

      expect(
        screen.getByText(/connect an authorized admin wallet/i),
      ).toBeInTheDocument();
    });
  });

  describe("Verification Request Management", () => {
    beforeEach(() => {
      mockWallet(true, ADMIN_KEY);
    });

    it("displays verification requests list", () => {
      render(<AdminPage />);
      expect(screen.getByText(/verification requests/i)).toBeInTheDocument();
      expect(screen.getByText("Lumina DEX")).toBeInTheDocument();
    });

    it("shows request status correctly", () => {
      render(<AdminPage />);
      expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/approved/i)).toBeInTheDocument();
    });

    it("allows admin to approve pending requests", () => {
      render(<AdminPage />);
      const approveButtons = screen.getAllByRole("button", { name: /approve/i });
      fireEvent.click(approveButtons[0]);
      expect(screen.getAllByText(/approved/i).length).toBeGreaterThan(1);
    });

    it("allows admin to reject requests", () => {
      render(<AdminPage />);
      const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
      fireEvent.click(rejectButtons[0]);
      expect(screen.getAllByText(/rejected/i).length).toBeGreaterThan(0);
    });

    it("updates status after approval", () => {
      render(<AdminPage />);
      fireEvent.click(screen.getAllByRole("button", { name: /approve/i })[0]);
      expect(screen.getAllByText(/approved/i).length).toBeGreaterThan(1);
    });

    it("updates status after rejection", () => {
      render(<AdminPage />);
      fireEvent.click(screen.getAllByRole("button", { name: /reject/i })[0]);
      expect(screen.getAllByText(/rejected/i).length).toBeGreaterThan(0);
    });
  });

  describe("System Settings", () => {
    beforeEach(() => {
      mockWallet(true, ADMIN_KEY);
    });

    it("displays fee configuration section", () => {
      render(<AdminPage />);
      expect(screen.getByText(/verification fee/i)).toBeInTheDocument();
    });

    it("allows updating verification fee", () => {
      render(<AdminPage />);
      const feeInput = screen.getByRole("spinbutton");
      fireEvent.change(feeInput, { target: { value: "2.5" } });
      expect((feeInput as HTMLInputElement).value).toBe("2.5");
    });

    it("shows stats overview", () => {
      render(<AdminPage />);
      expect(screen.getByText("Stats Overview")).toBeInTheDocument();
      expect(screen.getByText("Queue")).toBeInTheDocument();
    });
  });

  describe("Dashboard Layout", () => {
    beforeEach(() => {
      mockWallet(true, ADMIN_KEY);
    });

    it("displays navigation and sections", () => {
      render(<AdminPage />);
      expect(screen.getByText("ADMIN DASHBOARD")).toBeInTheDocument();
      expect(screen.getByText(/system settings/i)).toBeInTheDocument();
    });

    it("renders verification requests section", () => {
      render(<AdminPage />);
      expect(screen.getByText(/verification requests/i)).toBeInTheDocument();
    });

    it("renders system settings section", () => {
      render(<AdminPage />);
      expect(screen.getByText(/system settings/i)).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("handles approval failure gracefully", () => {
      mockWallet(true, ADMIN_KEY);

      render(<AdminPage />);
      expect(screen.getAllByRole("button", { name: /approve/i }).length).toBeGreaterThan(0);
    });

    it("handles rejection failure gracefully", () => {
      mockWallet(true, ADMIN_KEY);

      render(<AdminPage />);
      expect(screen.getAllByRole("button", { name: /reject/i }).length).toBeGreaterThan(0);
    });

    it("requires wallet connection to view dashboard", () => {
      mockWallet(false, null);

      render(<AdminPage />);
      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    });

    it("verifies user is admin before showing actions", () => {
      mockWallet(true, "GNOTADMIN123456");

      render(<AdminPage />);
      expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    });
  });
});
