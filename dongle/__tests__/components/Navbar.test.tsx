import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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
    onClick,
    ref,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    ref?: React.Ref<HTMLAnchorElement>;
  }) => (
    <a ref={ref} href={href} className={className} onClick={onClick}>
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
      retryAccountLoad: vi.fn(),
    },
  });
});

describe("Navbar active navigation", () => {
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
        retryAccountLoad: vi.fn(),
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

describe("Navbar mobile menu focus management", () => {
  const offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");

  beforeEach(() => {
    // jsdom has no layout, so treat every parented element as visible for the
    // shared focus-trap hook used by the nested dropdowns.
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return this.parentNode;
      },
    });
    // Deterministic animation frame so deferred focus lands within `waitFor`.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(performance.now()), 0),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (offsetParent) Object.defineProperty(HTMLElement.prototype, "offsetParent", offsetParent);
  });

  const openMenu = async () => {
    const toggle = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(toggle);
    const menu = document.getElementById("mobile-menu") as HTMLElement;
    await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
    return menu;
  };

  it("focuses the first menu item when the mobile menu opens", async () => {
    render(<Navbar />);
    const menu = await openMenu();
    const links = within(menu).getAllByRole("link");

    await waitFor(() => expect(document.activeElement).toBe(links[0]));
  });

  it("cycles focus forward and backward within the mobile menu", async () => {
    render(<Navbar />);
    const menu = await openMenu();
    const links = within(menu).getAllByRole("link");
    const first = links[0];
    const last = links[links.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes on Escape and returns focus to the toggle button", async () => {
    render(<Navbar />);
    const toggle = screen.getByRole("button", { name: /open menu/i });
    await openMenu();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(document.getElementById("mobile-menu")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(toggle);
    });
  });

  it("closes when clicking outside the mobile menu", async () => {
    render(<Navbar />);
    await openMenu();

    fireEvent.mouseDown(document.body);

    await waitFor(() =>
      expect(document.getElementById("mobile-menu")).not.toBeInTheDocument(),
    );
  });

  it("communicates open state to assistive technology", async () => {
    render(<Navbar />);
    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute("aria-expanded", "true"));
    expect(toggle).toHaveAttribute("aria-controls", "mobile-menu");
    expect(document.getElementById("mobile-menu")).toBeInTheDocument();
  });

  it("traps focus inside the nested language dropdown", async () => {
    render(<Navbar />);
    const trigger = screen.getByRole("button", { name: /select language/i });
    trigger.focus();
    fireEvent.click(trigger);

    const listbox = await screen.findByRole("listbox");
    const options = within(listbox).getAllByRole("option");
    await waitFor(() => expect(document.activeElement).toBe(options[0]));

    options[options.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(options[0]);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("traps focus inside the nested profile/sign-in dropdown", async () => {
    render(<Navbar />);
    const trigger = screen.getByRole("button", { name: /sign in/i });
    trigger.focus();
    fireEvent.click(trigger);

    const menu = await screen.findByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    await waitFor(() => expect(document.activeElement).toBe(items[0]));

    items[items.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(items[0]);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
