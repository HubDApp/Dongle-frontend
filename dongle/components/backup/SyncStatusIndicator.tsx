"use client";

/**
 * SyncStatusIndicator
 *
 * Compact, accessible indicator for the cross-device sync state:
 *   "Synced" · "Syncing" · "Sync failed" (plus "Offline" / "Sync off").
 */

import { AlertCircle, Check, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncStatus } from "@/hooks/useDeviceSync";

export interface SyncStatusIndicatorProps {
  status: SyncStatus;
  /** Number of changes queued while offline. */
  pendingCount?: number;
  /** Show the text label next to the icon (default: true). */
  showLabel?: boolean;
  className?: string;
}

const STATUS_META: Record<
  SyncStatus,
  { label: string; tone: string; icon: typeof Check; spin?: boolean }
> = {
  synced: { label: "Synced", tone: "text-emerald-600 dark:text-emerald-400", icon: Check },
  syncing: {
    label: "Syncing",
    tone: "text-blue-600 dark:text-blue-400",
    icon: RefreshCw,
    spin: true,
  },
  failed: {
    label: "Sync failed",
    tone: "text-red-600 dark:text-red-400",
    icon: AlertCircle,
  },
  offline: {
    label: "Offline",
    tone: "text-amber-600 dark:text-amber-400",
    icon: CloudOff,
  },
  disabled: { label: "Sync off", tone: "text-zinc-500 dark:text-zinc-400", icon: CloudOff },
};

export function SyncStatusIndicator({
  status,
  pendingCount = 0,
  showLabel = true,
  className,
}: SyncStatusIndicatorProps) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const label =
    status === "offline" && pendingCount > 0
      ? `Offline · ${pendingCount} queued`
      : meta.label;

  return (
    <span
      role="status"
      aria-live="polite"
      title={label}
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", meta.tone, className)}
    >
      <Icon className={cn("h-3.5 w-3.5", meta.spin && "animate-spin")} aria-hidden="true" />
      {showLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
