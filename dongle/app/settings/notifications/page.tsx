"use client";

import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { NotificationPreferencesComponent } from "@/components/notifications/NotificationPreferences";
import { useAuth } from "@/context/auth.context";
import { useWallet } from "@/context/wallet.context";
import { Bell } from "lucide-react";

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const { publicKey } = useWallet();
  const userId = user?.id ?? publicKey ?? "browser-default";

  return (
    <LayoutWrapper>
      <main className="min-h-screen bg-zinc-50 pb-24 pt-32 dark:bg-zinc-950">
        <div className="container mx-auto max-w-3xl px-4">
          <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h1 className="text-2xl font-bold">Notification settings</h1>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Set when notifications reach you and how activity is grouped.
            </p>
          </header>
          <NotificationPreferencesComponent userId={userId} />
        </div>
      </main>
    </LayoutWrapper>
  );
}
