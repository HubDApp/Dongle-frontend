"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import NetworkMismatchBanner from "./NetworkMismatchBanner";
import ProductionConfigBanner from "./ProductionConfigBanner";
import { ComparisonFloatingButton } from "@/components/compare/ComparisonFloatingButton";
import { OnlineStatusProvider } from "@/components/providers/OnlineStatusProvider";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <OnlineStatusProvider showBanner showToast>
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
    </OnlineStatusProvider>
  );
}
