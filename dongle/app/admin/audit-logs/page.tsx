"use client";

import { useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import WalletStatePanel, { WalletStateLoadingPanel } from "@/components/wallet/WalletStatePanel";
import AdminNav from "@/components/admin/AdminNav";
import AuditLogExplorer from "@/components/admin/AuditLogExplorer";
import { auditLogService } from "@/services/audit/audit-log.service";
import type { AuditLogEntry } from "@/types/audit-log";

const RETENTION_DAYS = Number(process.env.NEXT_PUBLIC_AUDIT_RETENTION_DAYS ?? 90) || 90;

export default function AdminAuditLogsPage() {
  const { isAdmin, isAdminChecking, gate } = useAdminAccess();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    setEntries(auditLogService.list());
  }, [isAdmin]);

  if (isAdminChecking || gate.state !== "ready") {
    return (
      <div className="container mx-auto px-4 py-32 max-w-2xl min-h-screen">
        {isAdminChecking || gate.state === "account-loading" ? (
          <WalletStateLoadingPanel message="Verifying admin access..." />
        ) : (
          <WalletStatePanel
            state={gate.state}
            pagePurpose="Connect an authorized admin wallet to browse audit logs."
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
        <p className="text-zinc-500">Connect an authorized admin wallet to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-black tracking-tight mb-2">AUDIT LOGS</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Searchable, filterable trail of every admin action. Select a row to see full event details.
          </p>
        </header>
        <AdminNav />
        <AuditLogExplorer initialEntries={entries} retentionDays={RETENTION_DAYS} />
      </div>
    </div>
  );
}
