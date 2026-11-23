"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useWatchlist } from "@/hooks/useWatchlist";
import { getPrefetchValue } from "@/lib/prefetch-config";

import { IconButton } from "@/components/ui/IconButton";
import { Menu, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import NotificationBell from "@/components/notifications/NotificationBell";
import LoginMenu from "@/components/auth/LoginMenu";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();

  const { isAdmin } = useAdminAccess();
  const { watchlistCount, canManageWatchlist } = useWatchlist();

  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const navLinks = [
    { href: "/discover", label: t("nav.discover") },
    { href: "/reviews", label: t("nav.reviews") },
    { href: "/lists", label: "Lists" },
    { href: "/verify", label: t("nav.verify") },
    { href: "/analytics", label: t("nav.analytics") },
    { href: "/projects/new", label: t("nav.submitProject") },
    { href: "/profile", label: t("nav.profile") },
  ];

  const isActive = (href: string) => pathname === href;

  const closeMenu = useCallback((options?: { returnFocus?: boolean }) => {
    setIsMenuOpen(false);
    if (options?.returnFocus) {
      requestAnimationFrame(() => {
        toggleBtnRef.current?.focus();
      });
    }
  }, []);

  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
    requestAnimationFrame(() => {
      firstMenuItemRef.current?.focus();
    });
  }, []);

  // Close menu on route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional on route change
    setIsMenuOpen(false);
  }, [pathname]);

  // Close menu when clicking/tapping outside of it (nested dropdowns and the
  // toggle button are treated as outside — the toggle keeps control of itself).
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (toggleBtnRef.current?.contains(target)) return;
      closeMenu();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen, closeMenu]);

  // Focus trap: keeps Tab / Shift+Tab inside the open mobile menu and lets
  // Escape close it, returning focus to the toggle button. Nested dropdowns
  // (language, profile) are rendered outside `menuRef` and run their own
  // traps, so focus that lands in them is left untouched here.
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ returnFocus: true });
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) return;

      const elements = getFocusableElements(menuRef.current);
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      const isInside = active instanceof HTMLElement && menuRef.current.contains(active);

      if (event.shiftKey) {
        if (!isInside || active === first) {
          event.preventDefault();
          last?.focus();
        }
      } else if (!isInside || active === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, closeMenu]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" prefetch={getPrefetchValue("landing")} className="text-xl font-bold tracking-tighter">
            DONGLE
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={getPrefetchValue("navigation")}
                className={`py-2 px-1 transition-all border-b-2 relative ${
                  isActive(link.href)
                    ? "text-black dark:text-white font-semibold border-black dark:border-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                {link.label}
                {link.href === "/profile" && canManageWatchlist && watchlistCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                    {watchlistCount}
                  </span>
                )}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                prefetch={getPrefetchValue("admin")}
                className={`py-2 px-1 transition-all border-b-2 ${
                  isActive("/admin")
                    ? "text-black dark:text-white font-semibold border-black dark:border-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                {t("nav.admin")}
              </Link>
            )}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <LanguageSelector />
          <NotificationBell />
          <LoginMenu />

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
                className={`block rounded-md py-2 px-1 text-sm font-medium transition-all border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
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
                className={`block rounded-md py-2 px-1 text-sm font-medium transition-all border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
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
