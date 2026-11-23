"use client";

import React from "react";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import SessionsPanel from "@/components/sessions/SessionsPanel";

export default function SettingsSessionsPage() {
  return (
    <LayoutWrapper>
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Active Sessions
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Devices that are currently signed in to your account. You can revoke any
              session you don&apos;t recognise.
            </p>
          </div>
          <SessionsPanel />
        </div>
      </main>
    </LayoutWrapper>
  );
}
