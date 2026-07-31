"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useWallet, EXPECTED_NETWORK_LABEL } from "@/context/wallet.context";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/useTranslation";

import AddressDisplay from "@/components/ui/AddressDisplay";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();
  const {
    isConnected,
    isConnecting,
    publicKey,
    isCorrectNetwork,
    walletNetworkLabel,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const { isAdmin } = useAdminAccess();

  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const navLinks = [
    { href: "/discover", label: t("nav.discover") },
    { href: "/reviews", label: t("nav.reviews") },
    { href: "/verify", label: t("nav.verify") },
    { href: "/projects/new", label: t("nav.submitProject") },
    { href: "/profile", label: t("nav.profile") },
  ];

  const isActive = (href: string) => pathname === href;

  const closeMenu = (options?: { returnFocus?: boolean }) => {
    setIsMenuOpen(false);
    if (options?.returnFocus) {
      requestAnimationFrame(() => {
        toggleBtnRef.current?.focus();
      });
    }
  };

  const openMenu = () => {
    setIsMenuOpen(true);
    requestAnimationFrame(() => {
      firstMenuItemRef.current?.focus();
    });
  };

  // Close menu on route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional on route change
    setIsMenuOpen(false);
  }, [pathname]);

  // Focus trap and escape key handler
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu({ returnFocus: true });
        return;
      }

      if (e.key === "Tab" && menuRef.current) {
        const focusable = menuRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const elements = Array.from(focusable).filter(Boolean) as HTMLElement[];

        if (elements.length === 0) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

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
            {isAdmin && (
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
                    {t("wallet.connected")}
                  </span>
                )}
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs py-1 px-3 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  {t("wallet.disconnect")}
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
              {isConnecting ? t("wallet.connecting") : t("wallet.connect")}
            </Button>
          )}

          {/* Mobile menu button */}
          <IconButton
            ref={toggleBtnRef}
            onClick={() => {
              if (isMenuOpen) {
                closeMenu({ returnFocus: true });
              } else {
                openMenu();
              }
            }}
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            size="md"
            variant="ghost"
            className="md:hidden rounded-md text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </IconButton>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div 
          id="mobile-menu" 
          ref={menuRef}
          aria-hidden={!isMenuOpen}
          className="md:hidden bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800"
        >
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                ref={link.href === "/discover" ? firstMenuItemRef : undefined}
                onClick={() => closeMenu({ returnFocus: true })}
                className={`block py-2 px-1 text-sm font-medium transition-all border-b-2 ${
                  isActive(link.href)
                    ? "text-black dark:text-white font-semibold border-black dark:border-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border-transparent"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => closeMenu({ returnFocus: true })}
                className={`block py-2 px-1 text-sm font-medium transition-all border-b-2 ${
                  isActive("/admin")
                    ? "text-black dark:text-white font-semibold border-black dark:border-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border-transparent"
                }`}
              >
                {t("nav.admin")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
