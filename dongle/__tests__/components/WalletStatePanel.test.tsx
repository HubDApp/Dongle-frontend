import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WalletStatePanel, {
  WalletDisconnectedBanner,
} from "@/components/wallet/WalletStatePanel";
import {
  getFriendbotUrl,
  getWalletStateContent,
  isAccountNotFundedError,
} from "@/components/wallet/wallet-states";

describe("wallet-states", () => {
  it("detects account-not-funded errors", () => {
    expect(isAccountNotFundedError("Account not found on Stellar Testnet")).toBe(true);
    expect(isAccountNotFundedError("Network timeout")).toBe(false);
  });

  it("builds Friendbot URL with encoded public key", () => {
    expect(getFriendbotUrl("GTEST123")).toBe(
      "https://friendbot.stellar.org?addr=GTEST123",
    );
  });

  it("includes Freighter install guidance", () => {
    const content = getWalletStateContent("freighter-missing");
    expect(content.title).toBe("Install Freighter Wallet");
    expect(content.primaryAction?.href).toContain("freighter.app");
  });

  it("includes Friendbot guidance for unfunded accounts", () => {
    const content = getWalletStateContent("account-not-funded", {
      publicKey: "GTEST123",
    });
    expect(content.title).toBe("Fund Your Testnet Account");
    expect(content.primaryAction?.href).toContain("friendbot.stellar.org");
  });
});

describe("WalletStatePanel", () => {
  it("renders disconnected state with connect action", () => {
    const onConnect = vi.fn();
    render(
      <WalletStatePanel
        state="disconnected"
        pagePurpose="Connect to continue."
        onConnect={onConnect}
      />,
    );

    expect(screen.getByText("Connect Your Wallet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Connect Wallet/i }));
    expect(onConnect).toHaveBeenCalled();
  });

  it("renders wrong-network guidance", () => {
    render(
      <WalletStatePanel
        state="wrong-network"
        walletNetworkLabel="Mainnet"
      />,
    );

    expect(screen.getByText("Wrong Network")).toBeInTheDocument();
    expect(screen.getByText(/Mainnet/)).toBeInTheDocument();
  });

  it("renders Freighter install link", () => {
    render(<WalletStatePanel state="freighter-missing" />);
    const link = screen.getByRole("link", { name: /Get Freighter/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("freighter.app"));
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("WalletDisconnectedBanner", () => {
  it("renders the 'Wallet not connected' heading", () => {
    render(
      <WalletDisconnectedBanner
        pagePurpose="Connect to post reviews."
        onConnect={vi.fn()}
      />,
    );
    expect(screen.getByText("Wallet not connected")).toBeInTheDocument();
  });

  it("shows the custom page purpose text", () => {
    render(
      <WalletDisconnectedBanner
        pagePurpose="Connect to post reviews."
        onConnect={vi.fn()}
      />,
    );
    expect(screen.getByText("Connect to post reviews.")).toBeInTheDocument();
  });

  it("shows default purpose text when none is provided", () => {
    render(<WalletDisconnectedBanner onConnect={vi.fn()} />);
    expect(
      screen.getByText(/Connect Freighter to post reviews/i),
    ).toBeInTheDocument();
  });

  it("calls onConnect when the button is clicked", () => {
    const onConnect = vi.fn();
    render(
      <WalletDisconnectedBanner
        pagePurpose="Connect to continue."
        onConnect={onConnect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Connect Wallet/i }));
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it("shows loading state on the button while isConnecting", () => {
    render(
      <WalletDisconnectedBanner
        pagePurpose="Connect to continue."
        onConnect={vi.fn()}
        isConnecting={true}
      />,
    );
    const button = screen.getByRole("button", { name: /Connect Wallet/i });
    expect(button).toBeDisabled();
  });
});
