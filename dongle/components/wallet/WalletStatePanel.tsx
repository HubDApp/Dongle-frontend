"use client";

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Download,
  Loader2,
  Wallet,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  getWalletStateContent,
  type WalletPageState,
} from "@/components/wallet/wallet-states";

interface WalletStatePanelProps {
  state: Exclude<WalletPageState, "ready" | "account-loading">;
  pagePurpose?: string;
  walletNetworkLabel?: string;
  publicKey?: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  compact?: boolean;
  className?: string;
}

const STATE_ICONS: Record<
  Exclude<WalletPageState, "ready" | "account-loading">,
  React.ReactNode
> = {
  "freighter-missing": <Download className="w-16 h-16 text-blue-500" />,
  connecting: <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />,
  disconnected: <Wallet className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />,
  "wrong-network": <AlertTriangle className="w-16 h-16 text-amber-500" />,
  "account-not-funded": <AlertCircle className="w-16 h-16 text-amber-500" />,
};

export default function WalletStatePanel({
  state,
  pagePurpose,
  walletNetworkLabel,
  publicKey,
  onConnect,
  onDisconnect,
  compact = false,
  className = "",
}: WalletStatePanelProps) {
  const content = getWalletStateContent(state, {
    pagePurpose,
    walletNetworkLabel,
    publicKey,
  });

  const padding = compact ? "py-12 px-6" : "py-24 px-8";

  const actionClassName =
    "inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] font-medium";

  const renderAction = (
    action: NonNullable<typeof content.primaryAction>,
    variant: "primary" | "outline" = "primary",
    onClick?: () => void,
  ) => {
    if (action.href) {
      return (
        <a
          href={action.href}
          target={action.external ? "_blank" : undefined}
          rel={action.external ? "noopener noreferrer" : undefined}
          className={`${actionClassName} ${
            variant === "primary"
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 px-8 py-4 text-lg rounded-[1.5rem] font-bold"
              : "bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 px-6 py-3 text-base rounded-2xl"
          } ${compact ? "!px-6 !py-3 !text-base !rounded-2xl" : ""}`}
        >
          {action.label}
        </a>
      );
    }

    return (
      <Button
        variant={variant}
        size={compact ? "md" : "lg"}
        className="inline-flex items-center gap-2"
        onClick={onClick}
        isLoading={state === "connecting"}
        disabled={state === "connecting"}
      >
        {state === "disconnected" && <Wallet className="w-5 h-5" />}
        {action.label}
      </Button>
    );
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 ${padding} ${className}`}
    >
      <div className="flex justify-center mb-4" aria-hidden="true">
        {STATE_ICONS[state]}
      </div>
      <h2 className={`font-bold mb-2 ${compact ? "text-2xl" : "text-3xl"}`}>
        {content.title}
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
        {content.description}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {content.primaryAction &&
          renderAction(
            content.primaryAction,
            "primary",
            state === "disconnected" ? onConnect : undefined,
          )}
        {content.secondaryAction &&
          renderAction(
            content.secondaryAction,
            "outline",
            state === "account-not-funded" ? onDisconnect : undefined,
          )}
      </div>
      {state === "freighter-missing" && (
        <p className="mt-6 text-xs text-zinc-400">
          After installing Freighter, refresh this page and connect your wallet.
        </p>
      )}
    </div>
  );
}

export function WalletStateLoadingPanel({
  message = "Loading wallet data...",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center py-24 ${className}`}
    >
      <Spinner size="lg" className="mb-4" />
      <p className="text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}

export function WalletDisconnectedBanner({
  pagePurpose,
  onConnect,
  isConnecting,
}: {
  pagePurpose?: string;
  onConnect?: () => void;
  isConnecting?: boolean;
}) {
  return (
    <div
      role="status"
      className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
    >
      <WifiOff className="w-5 h-5 shrink-0 text-zinc-400 mt-0.5" aria-hidden="true" />
      <div className="flex-1 text-left">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
          Wallet not connected
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {pagePurpose ??
            "Connect Freighter to post reviews and manage your on-chain activity."}
        </p>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={onConnect}
        isLoading={isConnecting}
        disabled={isConnecting}
      >
        Connect Wallet
      </Button>
    </div>
  );
}
