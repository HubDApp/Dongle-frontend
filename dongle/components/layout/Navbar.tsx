"use client";

import Link from "next/link";
import { useWallet } from "@/context/wallet.context";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
            <Link href="/projects/new" className="hover:text-black dark:hover:text-white transition-colors flex items-center gap-1">
              Register <Badge variant="primary">Dev</Badge>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1.5 pl-3 rounded-[1.5rem] shadow-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {publicKey ? `${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)}` : "Connected"}
              </span>
              <Button
                onClick={disconnectWallet}
                variant="outline"
                size="sm"
                className="rounded-full text-xs py-1 px-3 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              isLoading={isConnecting}
              size="sm"
              className="rounded-full"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
