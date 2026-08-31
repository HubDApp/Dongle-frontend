import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "@/components/layout/Navbar";
import * as walletContext from "@/context/wallet.context";
import * as adminAccess from "@/hooks/useAdminAccess";

const mockPathname = vi.fn(() => "/");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
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

vi.mock("@/hooks/useWatchlist", () => ({
  useWatchlist: () => ({
    watchlistCount: 0,
    canManageWatchlist: false,
  }),
}));

describe("Navbar active navigation", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isFreighterAvailable: true,
      publicKey: null,
      walletNetwork: null,
      isCorrectNetwork: false,
      walletNetworkLabel: "Unknown",
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
    });
    vi.spyOn(adminAccess, "useAdminAccess").mockReturnValue({
      isAdmin: false,
      isAdminChecking: false,
      gate: {
        state: "disconnected",
        publicKey: null,
        walletNetworkLabel: "Unknown",
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
        isConnecting: false,
      },
    });
  });

  it("highlights the active desktop nav link", () => {
    mockPathname.mockReturnValue("/discover");
    render(<Navbar />);

    const discoverLink = screen.getByRole("link", { name: "Discover" });
    expect(discoverLink.className).toContain("border-black");
    expect(discoverLink.className).toContain("font-semibold");
  });

  it.each([
    ["/discover", "Discover"],
    ["/reviews", "Reviews"],
    ["/verify", "Verify"],
    ["/analytics", "Analytics"],
    ["/projects/new", "Submit Project"],
    ["/profile", "Profile"],
  ])("marks %s as active on desktop", (path, label) => {
    mockPathname.mockReturnValue(path);
    render(<Navbar />);

    const link = screen.getByRole("link", { name: label });
    expect(link.className).toMatch(/border-black|dark:border-white/);
  });

  it("highlights admin when connected and on /admin", () => {
    mockPathname.mockReturnValue("/admin");
    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isFreighterAvailable: true,
      publicKey: "GADMIN1234567890",
      walletNetwork: "Test SDF Network ; September 2015",
      isCorrectNetwork: true,
      walletNetworkLabel: "Testnet",
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
    });
    vi.spyOn(adminAccess, "useAdminAccess").mockReturnValue({
      isAdmin: true,
      isAdminChecking: false,
      gate: {
        state: "ready",
        publicKey: "GADMIN1234567890",
        walletNetworkLabel: "Testnet",
        connectWallet: vi.fn(),
        disconnectWallet: vi.fn(),
        isConnecting: false,
      },
    });

    render(<Navbar />);

    const adminLink = screen.getByRole("link", { name: "Admin" });
    expect(adminLink.className).toContain("font-semibold");
  });

  it("keeps inactive desktop links visually subdued", () => {
    mockPathname.mockReturnValue("/discover");
    render(<Navbar />);

    const reviewsLink = screen.getByRole("link", { name: "Reviews" });
    expect(reviewsLink.className).toContain("border-transparent");
    expect(reviewsLink.className).toContain("text-zinc-600");
  });

  it("exposes accessible name and expanded state for the mobile menu button", () => {
    render(<Navbar />);

    const menuButton = screen.getByRole("button", { name: /open menu/i });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-controls", "mobile-menu");

    fireEvent.click(menuButton);

    const closeButton = screen.getByRole("button", { name: /close menu/i });
    expect(closeButton).toHaveAttribute("aria-expanded", "true");
  });

  it("renders the language selector and sign-in control", () => {
    render(<Navbar />);
    expect(screen.getByRole("button", { name: /select language/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open notifications/i })).toBeInTheDocument();
  });
});
