"use client";

import Link from "next/link";
import { useWallet } from "@/context/wallet.context";

export default function Navbar() {
  const { isConnected, isConnecting, publicKey, connectWallet, disconnectWallet } = useWallet();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter">
            DONGLE
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="/discover" className="hover:text-black dark:hover:text-white transition-colors">
              Discover
            </Link>
            <Link href="/reviews" className="hover:text-black dark:hover:text-white transition-colors">
              Reviews
            </Link>
            <Link href="/verify" className="hover:text-black dark:hover:text-white transition-colors">
              Verify
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1.5 pl-3 rounded-full shadow-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {publicKey ? `${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)}` : "Connected"}
              </span>
              <button
                onClick={disconnectWallet}
                className="text-xs px-3 py-1 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-full transition-colors border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
