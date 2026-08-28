"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { getPrefetchValue } from "@/lib/prefetch-config";

import { IconButton } from "@/components/ui/IconButton";
import { Menu, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import NotificationBell from "@/components/notifications/NotificationBell";
import LoginMenu from "@/components/auth/LoginMenu";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();

  const { isAdmin } = useAdminAccess();

  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const navLinks = [
    { href: "/discover", label: t("nav.discover") },
    { href: "/reviews", label: t("nav.reviews") },
    { href: "/verify", label: t("nav.verify") },
    { href: "/analytics", label: t("nav.analytics") },
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
          <Link href="/" prefetch={getPrefetchValue("landing")} className="text-xl font-bold tracking-tighter">
            DONGLE
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={getPrefetchValue("navigation")}
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
