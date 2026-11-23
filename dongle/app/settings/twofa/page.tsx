"use client";

import React from "react";
import TwoFASetupPageComponent from "@/components/twofa/TwoFASetupPage";
import LayoutWrapper from "@/components/layout/LayoutWrapper";

export default function SettingsTwoFAPage() {
  return (
    <LayoutWrapper>
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-2xl">
          <TwoFASetupPageComponent />
        </div>
      </main>
    </LayoutWrapper>
  );
}