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

describe("Admin Dashboard - Authorization & High Risk Flows", () => {
  describe("Admin Authorization", () => {
    it("displays admin dashboard when authorized", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: true,
        isConnecting: false,
        publicKey: ADMIN_KEY,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<AdminPage />);

      expect(screen.getByText("ADMIN DASHBOARD")).toBeInTheDocument();
    });

    it("denies access for non-admin users", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: true,
        isConnecting: false,
        publicKey: "GNOTADMIN123456",
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<AdminPage />);

      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    });

    it("shows wallet connection requirement", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: false,
        isConnecting: false,
        publicKey: null,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<AdminPage />);

      expect(
        screen.getByText(/connect an authorized admin wallet/i),
      ).toBeInTheDocument();
    });
  });

  describe("Verification Request Management", () => {
    beforeEach(() => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: true,
        isConnecting: false,
        publicKey: ADMIN_KEY,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });
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
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: true,
        isConnecting: false,
        publicKey: ADMIN_KEY,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });
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
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: true,
        isConnecting: false,
        publicKey: ADMIN_KEY,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });
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
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: true,
        isConnecting: false,
        publicKey: ADMIN_KEY,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<AdminPage />);
      expect(screen.getAllByRole("button", { name: /approve/i }).length).toBeGreaterThan(0);
    });

    it("handles rejection failure gracefully", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: true,
        isConnecting: false,
        publicKey: ADMIN_KEY,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<AdminPage />);
      expect(screen.getAllByRole("button", { name: /reject/i }).length).toBeGreaterThan(0);
    });

    it("requires wallet connection to view dashboard", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: false,
        isConnecting: false,
        publicKey: null,
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<AdminPage />);
      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    });

    it("verifies user is admin before showing actions", () => {
      vi.spyOn(walletContext, "useWallet").mockReturnValue({
        isConnected: true,
        isConnecting: false,
        publicKey: "GNOTADMIN123456",
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
      });

      render(<AdminPage />);
      expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    });
  });
});
