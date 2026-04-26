"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/context/wallet.context";
import { Button } from "@/components/ui/Button";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    isConnected,
    isConnecting,
    publicKey,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const navLinks = [
    { href: "/discover", label: "Discover" },
    { href: "/projects/new", label: "Submit Project" },
    { href: "/profile", label: "Profile" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter">
            DONGLE
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  isActive(link.href)
                    ? "text-black dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1.5 pl-3 rounded-2xl shadow-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {publicKey
                  ? `${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)}`
                  : "Connected"}
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

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-black dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
