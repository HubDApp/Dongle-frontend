"use client";

import { AlertTriangle } from "lucide-react";
import { useWallet, EXPECTED_NETWORK_LABEL } from "@/context/wallet.context";

/**
 * Sticky banner shown below the navbar when the connected wallet is on the
 * wrong network. Invisible when the wallet is disconnected or on the correct
 * network so it never takes up space unnecessarily.
 */
export default function NetworkMismatchBanner() {
  const { isConnected, isCorrectNetwork, walletNetworkLabel } = useWallet();

  if (!isConnected || isCorrectNetwork) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-16 z-40 w-full bg-amber-50 dark:bg-amber-950 border-b border-amber-300 dark:border-amber-700"
    >
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        <AlertTriangle
          className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
          <span className="font-semibold">Wrong network detected.</span>{" "}
          Your Freighter wallet is currently on{" "}
          <span className="font-mono font-semibold">{walletNetworkLabel}</span>.
          This app requires{" "}
          <span className="font-mono font-semibold">{EXPECTED_NETWORK_LABEL}</span>.
          {" "}Open Freighter, go to Settings → Network, and switch to{" "}
          <span className="font-semibold">{EXPECTED_NETWORK_LABEL}</span>{" "}
          before submitting any transactions.
        </p>
      </div>
    </div>
  );
}
