"use client";

import { useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import WalletStatePanel, { WalletStateLoadingPanel } from "@/components/wallet/WalletStatePanel";
import AdminNav from "@/components/admin/AdminNav";
import NotificationPreferencesForm from "@/components/admin/NotificationPreferencesForm";
import {
  notificationPreferencesService,
  type NotificationPreferences,
} from "@/services/admin/notification-preferences.service";

export default function AdminNotificationSettingsPage() {
  const { isAdmin, isAdminChecking, gate } = useAdminAccess();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    setPrefs(notificationPreferencesService.get());
  }, [isAdmin]);

  if (isAdminChecking || gate.state !== "ready") {
    return (
      <div className="container mx-auto px-4 py-32 max-w-2xl min-h-screen">
        {isAdminChecking || gate.state === "account-loading" ? (
          <WalletStateLoadingPanel message="Verifying admin access..." />
        ) : (
          <WalletStatePanel
            state={gate.state}
            pagePurpose="Connect an authorized admin wallet to configure alert triggers."
            walletNetworkLabel={gate.walletNetworkLabel}
            publicKey={gate.publicKey}
            onConnect={gate.connectWallet}
            onDisconnect={gate.disconnectWallet}
            onRetry={gate.retryAccountLoad}
          />
        )}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-32 text-center min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
        <p className="text-zinc-500">Connect an authorized admin wallet to configure notifications.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-black tracking-tight mb-2">NOTIFICATION SETTINGS</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Control which events alert admins, where they are delivered, and when to stay quiet.
          </p>
        </header>
        <AdminNav />
        {prefs ? (
          <NotificationPreferencesForm initial={prefs} />
        ) : (
          <p className="text-sm text-zinc-500">Loading preferences…</p>
        )}
      </div>
    </div>
  );
}
