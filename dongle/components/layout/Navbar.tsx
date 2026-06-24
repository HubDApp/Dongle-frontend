"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet, EXPECTED_NETWORK_LABEL } from "@/context/wallet.context";
import { Button } from "@/components/ui/Button";

import AddressDisplay from "@/components/ui/AddressDisplay";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    isConnected,
    isConnecting,
    publicKey,
    isCorrectNetwork,
    walletNetworkLabel,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const navLinks = [
    { href: "/discover", label: "Discover" },
    { href: "/reviews", label: "Reviews" },
    { href: "/verify", label: "Verify" },
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
                className={`py-2 px-1 transition-all border-b-2 ${
                  isActive(link.href)
                    ? "text-black dark:text-white font-semibold border-black dark:border-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isConnected && (
              <Link
                href="/admin"
                className={`py-2 px-1 transition-all border-b-2 ${
                  isActive("/admin")
                    ? "text-black dark:text-white font-semibold border-black dark:border-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-2">
              {/* Network badge — always visible when connected */}
              <span
                title={`Expected: ${EXPECTED_NETWORK_LABEL}`}
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isCorrectNetwork
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 animate-pulse"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCorrectNetwork ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                {isCorrectNetwork ? EXPECTED_NETWORK_LABEL : walletNetworkLabel}
              </span>

              {/* Wallet address pill */}
              <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1.5 pl-3 rounded-2xl shadow-sm">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                {publicKey ? (
                  <AddressDisplay address={publicKey} copyable={true} truncated={true} inline={true} />
                ) : (
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    Connected
                  </span>
                )}
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs py-1 px-3 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  Disconnect
                </Button>
              </div>
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
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
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
        <div id="mobile-menu" className="md:hidden bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800">
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
            {isConnected && (
              <Link
                href="/admin"
                onClick={() => setIsMenuOpen(false)}
                className={`block py-2 text-sm font-medium transition-colors ${
                  isActive("/admin")
                    ? "text-black dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
