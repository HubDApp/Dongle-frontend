"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, Check } from "lucide-react";
import { useWallet, MAX_WALLETS } from "@/context/wallet.context";
import { WALLET_META } from "@/services/wallet/wallet-adapters";
import { WalletSelectModal } from "./WalletSelectModal";

const short = (k: string) => `${k.slice(0, 4)}…${k.slice(-4)}`;

/** Dropdown to add, switch and remove connected wallets (issue #870). */
export function WalletAccountsMenu() {
  const { accounts, publicKey, switchAccount, removeAccount, disconnectWallet } = useWallet();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const full = accounts.length >= MAX_WALLETS;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Manage wallets"
        className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-zinc-500">
            Wallets ({accounts.length}/{MAX_WALLETS})
          </p>
          <ul className="space-y-1">
            {accounts.map((a) => {
              const active = a.publicKey === publicKey;
              return (
                <li
                  key={a.publicKey}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${active ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.label}</p>
                    <p className="font-mono text-xs text-zinc-500">
                      {short(a.publicKey)} · {WALLET_META[a.walletType].name}
                    </p>
                  </div>
                  {active ? (
                    <Check className="h-4 w-4 text-blue-600" aria-label="Active wallet" />
                  ) : (
                    <button
                      role="menuitem"
                      onClick={() => {
                        switchAccount(a.publicKey);
                        setOpen(false);
                      }}
                      className="rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      Switch to {short(a.publicKey)}
                    </button>
                  )}
                  <button
                    role="menuitem"
                    onClick={() => removeAccount(a.publicKey)}
                    aria-label={`Remove ${a.label}`}
                    className="rounded-md p-1 text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
            <button
              role="menuitem"
              disabled={full}
              title={full ? `Maximum of ${MAX_WALLETS} wallets` : undefined}
              onClick={() => {
                setAdding(true);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" /> Add wallet
            </button>
            <button
              role="menuitem"
              onClick={disconnectWallet}
              className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Disconnect all
            </button>
          </div>
        </div>
      )}
      <WalletSelectModal open={adding} onClose={() => setAdding(false)} mode="add" />
    </div>
  );
}

export default WalletAccountsMenu;
