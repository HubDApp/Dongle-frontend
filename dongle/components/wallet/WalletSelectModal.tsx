"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet, Usb, Globe, X, AlertTriangle } from "lucide-react";
import { useWallet } from "@/context/wallet.context";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import {
  WALLET_META,
  WALLET_TYPES,
  WalletType,
  isLedgerSupported,
} from "@/services/wallet/wallet-adapters";

const ICONS: Record<WalletType, typeof Wallet> = {
  freighter: Wallet,
  ledger: Usb,
  albedo: Globe,
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** "add" connects an extra wallet instead of replacing the current one. */
  mode?: "connect" | "add";
}

/** Wallet picker for Freighter, Ledger and Albedo (issue #869). */
export function WalletSelectModal({ open, onClose, mode = "connect" }: Props) {
  const { connectWallet, addWallet, isConnecting, isFreighterAvailable, preferredWalletType } =
    useWallet();
  const [selected, setSelected] = useState<WalletType>(preferredWalletType);
  const [ledgerOk, setLedgerOk] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Issue #939: trap focus, focus the first control on open, restore focus on close, Esc to dismiss.
  useModalFocusTrap(open, dialogRef, undefined, onClose);

  useEffect(() => {
    if (!open) return;
    setSelected(preferredWalletType);
    setLedgerOk(isLedgerSupported());
  }, [open, preferredWalletType]);

  if (!open) return null;

  const unavailable: Partial<Record<WalletType, string>> = {
    ...(isFreighterAvailable === false && {
      freighter: "Freighter extension not detected. Install it or pick another wallet.",
    }),
    ...(!ledgerOk && {
      ledger: "USB hardware wallets need Chrome, Edge or Brave on desktop. Try Albedo instead.",
    }),
  };

  const handleConnect = async () => {
    await (mode === "add" ? addWallet(selected) : connectWallet(selected));
    onClose();
  };

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="wallet-select-title">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <h2 id="wallet-select-title" className="text-lg font-semibold">
            {mode === "add" ? "Add another wallet" : "Connect a wallet"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-2" role="radiogroup" aria-label="Wallet type">
          {WALLET_TYPES.map((type) => {
            const Icon = ICONS[type];
            const active = selected === type;
            return (
              <button
                key={type}
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(type)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                    : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{WALLET_META[type].name}</span>
                  <span className="block text-xs text-zinc-500">{WALLET_META[type].description}</span>
                </span>
                {unavailable[type] && <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Unavailable" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            How to connect {WALLET_META[selected].name}
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {WALLET_META[selected].instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        {unavailable[selected] && (
          <div role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 p-3 text-sm text-amber-800 dark:text-amber-200">
            {unavailable[selected]}
          </div>
        )}

        <button
          onClick={() => void handleConnect()}
          disabled={isConnecting || Boolean(unavailable[selected])}
          className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isConnecting ? "Connecting…" : `Connect ${WALLET_META[selected].name}`}
        </button>
      </div>
    </div>
  );
}

export default WalletSelectModal;
