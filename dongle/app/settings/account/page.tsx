"use client";

import Link from "next/link";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import AccountSettingsPanel from "@/components/settings/AccountSettingsPanel";

export default function SettingsAccountPage() {
  return (
    <LayoutWrapper>
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Profile settings</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your profile and linked wallet.{" "}
              <Link href="/settings/permissions" className="underline">
                View OAuth permissions
              </Link>
            </p>
          </div>
          <AccountSettingsPanel />
        </div>
      </main>
    </LayoutWrapper>
  );
}
