"use client";

import { useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import NetworkMismatchBanner from "./NetworkMismatchBanner";
import ProductionConfigBanner from "./ProductionConfigBanner";
import { ComparisonFloatingButton } from "@/components/compare/ComparisonFloatingButton";

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
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ProductionConfigBanner />
      <NetworkMismatchBanner />
      <main className="grow pt-16">
        {children}
      </main>
      <Footer />
      <ComparisonFloatingButton />
    </div>
  );
}
