import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WalletStatePanel from "@/components/wallet/WalletStatePanel";
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
