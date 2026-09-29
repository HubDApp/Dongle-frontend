"use client";

import React from "react";
import WalletStatePanel, {
  WalletStateLoadingPanel,
} from "@/components/wallet/WalletStatePanel";
import type { WalletPageGateResult } from "@/hooks/useWalletPageGate";

export interface WalletGateProps {
  /**
   * Pre-resolved gate state from `useWalletPageGate`. Pages should pass the
   * result of the hook so we don't fetch the Horizon account twice (once for
   * the page's own gate logic and again here).
   */
  gate: WalletPageGateResult;
  /** Human-readable reason this page needs a wallet. Shown on the disconnected panel. */
  pagePurpose: string;
  /** Loading message shown while the wallet/account is loading. */
  loadingMessage?: string;
  /** Optional max-width / spacing className forwarded to the panels. */
  className?: string;
  /** Render the panels in compact form (smaller padding, smaller icons). */
  compact?: boolean;
}

/**
 * Renders the wallet-gate UI for any non-`"ready"` state.
 *
 * The gate state is owned by the page (via `useWalletPageGate`); this
 * component just renders the matching panel so the same UX/messaging is
 * shared everywhere (freighter missing → connecting → disconnected →
 * wrong network → account loading → account not funded).
 *
 * Usage:
 * ```tsx
 * const gate = useWalletPageGate({ requireFundedAccount: true });
 *
 * if (gate.state !== "ready") {
 *   return <WalletGate gate={gate} pagePurpose="..." />;
 * }
 *
 * return <FullContent gate={gate} />;
 * ```
 */
export default function WalletGate({
  gate,
  pagePurpose,
  loadingMessage = "Loading wallet data...",
  className,
  compact = false,
}: WalletGateProps) {
  // When ready, the consumer renders its own content (using `gate.publicKey`,
  // `gate.disconnectWallet`, etc). Returning null here makes accidental
  // placement outside an `if (state !== "ready")` branch obvious during
  // development, rather than silently rendering a stray panel.
  if (gate.state === "ready") return null;

  if (gate.state === "account-loading") {
    return <WalletStateLoadingPanel message={loadingMessage} className={className} />;
  }

  return (
    <WalletStatePanel
      state={gate.state}
      pagePurpose={pagePurpose}
      walletNetworkLabel={gate.walletNetworkLabel}
      publicKey={gate.publicKey}
      onConnect={gate.connectWallet}
      onDisconnect={gate.disconnectWallet}
      compact={compact}
      className={className}
    />
  );
}
