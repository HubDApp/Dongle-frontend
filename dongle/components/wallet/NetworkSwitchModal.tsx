"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useWallet, EXPECTED_NETWORK_LABEL } from "@/context/wallet.context";
import type { WalletType } from "@/services/wallet/wallet-adapters";

const HIDE_KEY = "dongle_hide_network_modal";

function getSteps(type: WalletType, mobile: boolean): string[] {
  const target = EXPECTED_NETWORK_LABEL;
  switch (type) {
    case "ledger":
      return [
        "Ledger signs for whichever network Dongle requests — no change on the device is needed.",
        "Reconnect your Ledger and reopen the Stellar app.",
        `Tap "I've switched" to recheck the ${target} connection.`,
      ];
    case "albedo":
      return [
        "Albedo uses the network Dongle requests for each signature.",
        `When the Albedo window opens, confirm it shows ${target}.`,
        `Tap "I've switched" to recheck.`,
      ];
    default:
      return mobile
        ? [
            "Open the Freighter mobile app.",
            "Tap the menu (☰) → Settings → Network.",
            `Select ${target} and return to this page.`,
            `Tap "I've switched".`,
          ]
        : [
            "Open Freighter by clicking its icon in your browser toolbar.",
            "Click the gear icon (Settings) → Network.",
            `Select ${target} from the list.`,
            `Return here and click "I've switched".`,
          ];
  }
}

/** Illustration of Freighter's network settings (stands in for a screenshot). */
function FreighterIllustration() {
  const options = ["Mainnet", "Testnet", "Futurenet"];
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[220px] rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-900 p-3 text-zinc-100 shadow-inner">
      <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
        <span>Settings › Network</span>
        <span>⚙</span>
      </div>
      {options.map((o) => (
        <div
          key={o}
          className={`mb-1 flex items-center justify-between rounded-md px-2 py-1.5 text-xs ${
            o === EXPECTED_NETWORK_LABEL ? "bg-violet-600 animate-pulse" : "bg-zinc-800"
          }`}
        >
          {o}
          {o === EXPECTED_NETWORK_LABEL && <span>✓</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * Guides users through switching networks when a mismatch is detected
 * (issue #871). When dismissed, the NetworkMismatchBanner stays visible.
 */
export function NetworkSwitchModal() {
  const { isConnected, isCorrectNetwork, walletNetworkLabel, walletType, recheckNetwork } =
    useWallet();
  const [dismissed, setDismissed] = useState(false);
  const [hidePermanently, setHidePermanently] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const [checking, setChecking] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    try {
      setHidePermanently(localStorage.getItem(HIDE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setMobile(/Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  // Re-show the modal on the next mismatch after the user fixes it.
  useEffect(() => {
    if (isCorrectNetwork) setDismissed(false);
  }, [isCorrectNetwork]);

  const mismatch = isConnected && !isCorrectNetwork && walletNetworkLabel !== "Unknown";
  if (!mismatch || dismissed || hidePermanently) return null;

  const close = () => {
    if (dontShow) {
      try {
        localStorage.setItem(HIDE_KEY, "1");
      } catch {
        /* ignore */
      }
      setHidePermanently(true);
    }
    setDismissed(true);
  };

  const recheck = async () => {
    setChecking(true);
    const ok = await recheckNetwork();
    setChecking(false);
    if (ok) toast.success(`Connected to ${EXPECTED_NETWORK_LABEL}`);
    else toast.error(`Still on ${walletNetworkLabel}. Follow the steps and try again.`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="network-switch-title">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="network-switch-title" className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Switch to {EXPECTED_NETWORK_LABEL}
          </h2>
          <button onClick={close} aria-label="Dismiss" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Your wallet is on <span className="font-mono font-semibold">{walletNetworkLabel}</span>, but Dongle
          requires <span className="font-mono font-semibold">{EXPECTED_NETWORK_LABEL}</span>.
        </p>

        {walletType === "freighter" && <FreighterIllustration />}

        <ol className="mt-4 space-y-2 text-sm">
          {getSteps(walletType, mobile).map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        <label className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          Don&apos;t show again (not recommended)
        </label>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={close} className="rounded-xl px-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Dismiss
          </button>
          <button
            onClick={() => void recheck()}
            disabled={checking}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            I&apos;ve switched
          </button>
        </div>
      </div>
    </div>
  );
}

export default NetworkSwitchModal;
