"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CommandPalette from "./CommandPalette";
import NetworkMismatchBanner from "./NetworkMismatchBanner";
import ProductionConfigBanner from "./ProductionConfigBanner";
import { ComparisonFloatingButton } from "@/components/compare/ComparisonFloatingButton";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useWallet } from "@/context/wallet.context";
import { useRouter } from "next/navigation";
import { useComparison } from "@/context/comparison.context";
import { toast } from "sonner";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Service worker registration failed — app works without offline support
  });
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const { publicKey } = useWallet();
  const router = useRouter();
  const { selectedProjects } = useComparison();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  const focusSearch = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>(
      'input[type="search"], input[placeholder*="Search"]',
    );
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      toast.info("Search focused", { duration: 1200 });
    } else {
      // Navigate to discover if no search bar is visible
      router.push("/discover");
    }
  }, [router]);

  const openComparison = useCallback(() => {
    if (selectedProjects.length === 0) {
      toast.info("Add projects to compare first", { duration: 1800 });
    } else {
      router.push("/compare");
    }
  }, [router, selectedProjects.length]);

  useKeyboardShortcuts({
    onFocusSearch: focusSearch,
    onOpenComparison: openComparison,
    onShowHelp: () => setIsShortcutsModalOpen(true),
    onClose: () => setIsShortcutsModalOpen(false),
    isAuthenticated: Boolean(publicKey),
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <CommandPalette />
      <ProductionConfigBanner />
      <NetworkMismatchBanner />
      <main className="grow pt-16">
        {children}
      </main>
      <Footer />
      <ComparisonFloatingButton />
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        isAuthenticated={Boolean(publicKey)}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
