"use client";

import { useState } from "react";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { QrCode, Wallet, Smartphone, Award, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnected?: (session: any) => void;
}

/**
 * Wallet selection modal (Freighter or Wallet Connect) with QR code for mobile
 * wallet connection. Implements issue #723 wallet selection UI.
 */
export function WalletConnectModal({ open, onClose, onConnected }: WalletConnectModalProps) {
  const { session, connecting, error, networkValid, connect, disconnect, signTransaction } = useWalletConnect();
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center", open ? "opacity-100 pointer-events-auto" : "hidden opacity-0 pointer-events-none transition")}
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card p-6 rounded-xl shadow-lg max-w-md w-full border">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">Connect Wallet</h2>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {session ? (
            <div className="rounded-lg border p-4 flex items-center gap-3 bg-success/10 border-success/20">
              {session.provider === "walletconnect" ? (
                <Award className="h-5 w-5 text-success" />
              ) : (
                <Wallet className="h-5 w-5 text-success" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">Connected: {session.provider}</p>
                <p className="text-xs text-muted-foreground truncate">{session.address}</p>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                    networkValid ? "bg-success/10 text-success border border-success/30" : "bg-destructive/10 text-destructive border border-destructive/30"
                  }`}
                >
                  {networkValid ? "Stellar network OK" : "Wrong network"}
                </span>
                <button
                  onClick={disconnect}
                  className="text-xs text-muted-foreground hover:text-destructive underline"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                Choose how to connect. Wallet Connect v2 supports mobile wallets
                via QR code; Freighter is the desktop Stellar wallet.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => connect("walletconnect")}
                  disabled={connecting}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border hover:bg-accent transition disabled:opacity-50"
                >
                  <Smartphone className="h-4 w-4" />
                  <span className="text-sm font-medium">Wallet Connect</span>
                </button>
                <button
                  onClick={() => connect("freighter")}
                  disabled={connecting}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border hover:bg-accent transition disabled:opacity-50"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm font-medium">Freighter</span>
                </button>
              </div>
              {connecting && <p className="text-xs text-muted-foreground">Connecting…</p>}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                  <ShieldAlert className="h-3 w-3 mr-1" /> {error}
                  <p className="text-xs text-muted-foreground mt-1">
                    Falling back to Freighter if Wallet Connect is unavailable.
                  </p>
                </div>
              )}
            </>
          )}

          {session && session.provider === "walletconnect" && (
            <div className="pt-2">
              <button
                onClick={() => setQrOpen(true)}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border hover:bg-accent transition text-sm"
              >
                <QrCode className="h-4 w-4" />
                Show QR code for mobile
              </button>
            </div>
          )}
        </div>

        {qrOpen && session && session.provider === "walletconnect" && session.uri && (
          <div className="mt-6 rounded-lg border p-4 bg-muted text-center">
            <p className="text-xs font-medium text-muted-foreground mb-3">Scan with your mobile wallet</p>
            <div className="flex justify-center">
              <div className="border p-1 bg-white rounded inline-block">
                <pre className="text-[10px] break-all text-foreground max-w-[240px]">{session.uri}</pre>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pairing URI: {session.uri.slice(0, 30)}…
            </p>
            <button onClick={() => setQrOpen(false)} className="mt-3 text-xs text-primary underline">Close</button>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-accent">
            {session ? "Done" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
