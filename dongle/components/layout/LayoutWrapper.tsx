"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import NetworkMismatchBanner from "./NetworkMismatchBanner";
import { ComparisonFloatingButton } from "@/components/compare/ComparisonFloatingButton";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <NetworkMismatchBanner />
      <main className="grow pt-16">
        {children}
      </main>
      <Footer />
      <ComparisonFloatingButton />
    </div>
  );
}
