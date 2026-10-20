"use client";

import { useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import WalletStatePanel, { WalletStateLoadingPanel } from "@/components/wallet/WalletStatePanel";
import AdminNav from "@/components/admin/AdminNav";
import BatchOperationsPanel from "@/components/admin/BatchOperationsPanel";
import { projectService } from "@/services/project/project.service";
import { reviewService } from "@/services/review/review.service";
import type { BatchItemHandler } from "@/services/admin/batch-operations.service";

interface DemoUser {
  id: string;
  label: string;
  detail: string;
}

function storedIds(key: string): Array<{ id: string; label: string; detail?: string }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 100).map((item, i) => {
      if (typeof item === "string") return { id: item, label: item };
      const r = item as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id : `${key}-${i}`;
      const label =
        typeof r.name === "string"
          ? r.name
          : typeof r.title === "string"
            ? r.title
            : typeof r.projectName === "string"
              ? r.projectName
              : id;
      return { id, label, detail: typeof r.status === "string" ? r.status : undefined };
    });
  } catch {
    return [];
  }
}

const noOpHandler: BatchItemHandler = async () => ({ undo: () => undefined });

export default function AdminBatchPage() {
  const { isAdmin, isAdminChecking, gate } = useAdminAccess();
  const [projects, setProjects] = useState<Array<{ id: string; label: string; detail?: string }>>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; label: string; detail?: string }>>([]);
  const [users, setUsers] = useState<DemoUser[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const allProjects = projectService.getAllProjects();
        const allReviews = await reviewService.getReviews();
        setProjects(
          (Array.isArray(allProjects) ? allProjects : []).slice(0, 100).map((p, i) => ({
            id: String(p.id ?? `project-${i}`),
            label: String(p.name ?? `Project ${i + 1}`),
          })),
        );
        setReviews(
          (Array.isArray(allReviews) ? allReviews : []).slice(0, 100).map((r, i) => ({
            id: String(r.id ?? `review-${i}`),
            label: `Review ${String(r.id ?? i + 1)}`,
          })),
        );
      } catch {
        setProjects(storedIds("dongle_projects"));
        setReviews(storedIds("dongle_reviews"));
      }
      const storedUsers = storedIds("dongle_users");
      setUsers(
        storedUsers.length > 0
          ? storedUsers.map((u) => ({ id: u.id, label: u.label, detail: u.detail ?? "member" }))
          : [
              { id: "GUSER…001", label: "Member GUSER…001", detail: "member" },
              { id: "GUSER…002", label: "Member GUSER…002", detail: "member" },
            ],
      );
    };
    void load();
  }, [isAdmin]);

  if (isAdminChecking || gate.state !== "ready") {
    return (
      <div className="container mx-auto px-4 py-32 max-w-2xl min-h-screen">
        {isAdminChecking || gate.state === "account-loading" ? (
          <WalletStateLoadingPanel message="Verifying admin access..." />
        ) : (
          <WalletStatePanel
            state={gate.state}
            pagePurpose="Connect an authorized admin wallet to run batch operations."
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
        <p className="text-zinc-500">Connect an authorized admin wallet to run batch operations.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-4xl font-black tracking-tight mb-2">BATCH OPERATIONS</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Select items with checkboxes, confirm the action, watch async progress, and roll back automatically on partial failure. Every item is audit-logged.
          </p>
        </header>
        <AdminNav />
        <BatchOperationsPanel
          entity="projects"
          title="Projects — feature, hide, delete"
          items={projects}
          handler={noOpHandler}
          auditAction="submission_moderated"
        />
        <BatchOperationsPanel
          entity="reviews"
          title="Reviews — approve, remove, flag"
          items={reviews}
          handler={noOpHandler}
          auditAction="report_resolved"
        />
        <BatchOperationsPanel
          entity="users"
          title="Users — ban, promote, message"
          items={users.map((u) => ({ id: u.id, label: u.label, detail: u.detail }))}
          handler={noOpHandler}
        />
      </div>
    </div>
  );
}
