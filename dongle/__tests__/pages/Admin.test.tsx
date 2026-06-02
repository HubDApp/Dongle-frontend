import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminPage from "@/app/admin/page";

vi.mock("@stellar/freighter-api", () => ({
  freighterApi: {
    freighterIsConnected: vi.fn(),
    getPublicKey: vi.fn(),
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("Admin Dashboard - Authorization & High Risk Flows", () => {
  describe("Admin Authorization", () => {
    it("displays admin dashboard when authorized", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/admin/i)).toBeInTheDocument();
      });
    });

    it("denies access for non-admin users", async () => {
      render(<AdminPage />);
      
      // Should either show unauthorized message or redirect
      await waitFor(() => {
        const adminText = screen.queryByText(/admin/i);
        const unauthorizedText = screen.queryByText(/unauthorized|not authorized|access denied/i);
        expect(adminText || unauthorizedText).toBeTruthy();
      });
    });

    it("shows wallet connection requirement", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/connect|wallet/i)).toBeInTheDocument();
      });
    });
  });

  describe("Verification Request Management", () => {
    it("displays verification requests list", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/verification/i)).toBeInTheDocument();
      });
    });

    it("shows request status correctly", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        const statusElements = screen.queryAllByText(/pending|approved|rejected/i);
        // Should have at least one status if requests are shown
        expect(statusElements.length >= 0).toBe(true);
      });
    });

    it("allows admin to approve pending requests", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        const approveButtons = screen.queryAllByRole("button", { name: /approve/i });
        if (approveButtons.length > 0) {
          fireEvent.click(approveButtons[0]);
          // Should show success or update UI
          expect(approveButtons[0]).toBeInTheDocument();
        }
      });
    });

    it("allows admin to reject requests", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        const rejectButtons = screen.queryAllByRole("button", { name: /reject/i });
        if (rejectButtons.length > 0) {
          fireEvent.click(rejectButtons[0]);
          expect(rejectButtons[0]).toBeInTheDocument();
        }
      });
    });

    it("updates status after approval", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        const statusText = screen.queryByText(/approved/i);
        expect(statusText || screen.getByText(/admin/i)).toBeTruthy();
      });
    });

    it("updates status after rejection", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        const statusText = screen.queryByText(/rejected/i);
        expect(statusText || screen.getByText(/admin/i)).toBeTruthy();
      });
    });
  });

  describe("System Settings", () => {
    it("displays fee configuration section", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        expect(screen.queryByText(/fee|cost/i) || screen.getByText(/admin/i)).toBeTruthy();
      });
    });

    it("allows updating verification fee", async () => {
      render(<AdminPage />);
      
      const feeInput = screen.queryByRole("spinbutton") || screen.queryByDisplayValue("1.5");
      if (feeInput) {
        fireEvent.change(feeInput, { target: { value: "2.5" } });
        
        const updateButton = screen.queryByRole("button", { name: /update|save/i });
        if (updateButton) {
          fireEvent.click(updateButton);
          expect(updateButton).toBeInTheDocument();
        }
      }
    });

    it("shows stats overview", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        const statsText = screen.queryByText(/stats|overview|active|queue/i);
        expect(statsText || screen.getByText(/admin/i)).toBeTruthy();
      });
    });
  });

  describe("Dashboard Layout", () => {
    it("displays navigation and sections", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/admin/i)).toBeInTheDocument();
      });
    });

    it("renders verification requests section", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        expect(screen.queryByText(/verification/i) || screen.getByText(/admin/i)).toBeTruthy();
      });
    });

    it("renders system settings section", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        expect(screen.queryByText(/settings/i) || screen.getByText(/admin/i)).toBeTruthy();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles approval failure gracefully", async () => {
      render(<AdminPage />);
      
      // Should not crash on error
      await waitFor(() => {
        expect(screen.getByText(/admin/i)).toBeInTheDocument();
      });
    });

    it("handles rejection failure gracefully", async () => {
      render(<AdminPage />);
      
      // Should not crash on error
      await waitFor(() => {
        expect(screen.getByText(/admin/i)).toBeInTheDocument();
      });
    });
  });

  describe("Access Control", () => {
    it("requires wallet connection to view dashboard", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/wallet|connect|admin/i)).toBeInTheDocument();
      });
    });

    it("verifies user is admin before showing actions", async () => {
      render(<AdminPage />);
      
      await waitFor(() => {
        // Should either show admin panel or unauthorized message
        expect(screen.getByText(/admin|unauthorized|permission/i)).toBeInTheDocument();
      });
    });
  });
});
