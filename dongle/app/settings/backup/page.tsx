"use client";

/**
 * Settings → Cloud backup
 *
 * Opt-in, client-side encrypted backup so reviews, drafts, bookmarks and
 * settings can be restored on another device. Everything is encrypted on this
 * device before upload, so the data is not visible to Dongle or its admins.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudDownload,
  CloudUpload,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DeviceList, SyncStatusIndicator } from "@/components/backup";
import { useWallet } from "@/context/wallet.context";
import { useSync } from "@/context/sync.context";
import { useConfirm } from "@/hooks/useConfirm";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { AUTO_SYNC_INTERVAL_MS, type BackupConflict } from "@/hooks/useCloudBackup";
import type { BackupSectionKey } from "@/services/backup/cloud-backup.service";

function formatTimestamp(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// ---------------------------------------------------------------------------
// Conflict resolution dialog
// ---------------------------------------------------------------------------

function BackupConflictDialog({
  conflict,
  isBusy,
  onResolve,
  onCancel,
}: {
  conflict: BackupConflict;
  isBusy: boolean;
  onResolve: (choices: Record<BackupSectionKey, "local" | "remote">) => void;
  onCancel: () => void;
}) {
  const [choices, setChoices] = useState<Record<BackupSectionKey, "local" | "remote">>(() => {
    const initial = {} as Record<BackupSectionKey, "local" | "remote">;
    conflict.sections.forEach((section) => {
      initial[section.key] = "local";
    });
    return initial;
  });

  const setChoice = (key: BackupSectionKey, choice: "local" | "remote") => {
    setChoices((prev) => ({ ...prev, [key]: choice }));
  };

  const setAll = (choice: "local" | "remote") => {
    const next = {} as Record<BackupSectionKey, "local" | "remote">;
    conflict.sections.forEach((section) => {
      next[section.key] = choice;
    });
    setChoices(next);
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  // Issue #939: the dialog is only mounted while a conflict exists, so treat it as always open.
  // Traps focus, focuses the first control on mount, restores focus on unmount, Esc to dismiss.
  useModalFocusTrap(true, dialogRef, undefined, onCancel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-conflict-title"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-800 dark:bg-zinc-900"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" aria-hidden="true" />
          <div>
            <h2
              id="backup-conflict-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              Resolve backup conflict
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              This device and the cloud backup contain different data. Choose which version to keep
              for each section. Non-listed sections are identical.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-zinc-100 py-2.5 text-xs dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400">Select all:</span>
          <button
            type="button"
            onClick={() => setAll("local")}
            className="rounded-lg border border-blue-200 px-2.5 py-1 font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            Keep this device
          </button>
          <button
            type="button"
            onClick={() => setAll("remote")}
            className="rounded-lg border border-purple-200 px-2.5 py-1 font-medium text-purple-700 transition-colors hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/30"
          >
            Use cloud
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="w-1/5 py-2 pr-3">Section</th>
                <th className="w-2/5 py-2 pr-3">This device</th>
                <th className="w-2/5 py-2">Cloud backup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {conflict.sections.map((section) => (
                <tr key={section.key}>
                  <td className="py-3 pr-3 align-top">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {section.label}
                    </span>
                    {section.differs && (
                      <span className="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        Differs
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <button
                      type="button"
                      aria-pressed={choices[section.key] === "local"}
                      onClick={() => setChoice(section.key, "local")}
                      className={`w-full rounded-xl border-2 p-2.5 text-left text-xs transition-all ${
                        choices[section.key] === "local"
                          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{section.localSummary}</span>
                        {choices[section.key] === "local" && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden="true" />
                        )}
                      </span>
                    </button>
                  </td>
                  <td className="py-3 align-top">
                    <button
                      type="button"
                      aria-pressed={choices[section.key] === "remote"}
                      onClick={() => setChoice(section.key, "remote")}
                      className={`w-full rounded-xl border-2 p-2.5 text-left text-xs transition-all ${
                        choices[section.key] === "remote"
                          ? "border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-950/30"
                          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{section.remoteSummary}</span>
                        {choices[section.key] === "remote" && (
                          <Check
                            className="h-3.5 w-3.5 shrink-0 text-purple-500"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onResolve(choices)}
            isLoading={isBusy}
            loadingText="Syncing..."
          >
            Apply &amp; sync
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CloudBackupSettingsPage() {
  const { publicKey } = useWallet();
  const { backup, device } = useSync();
  const confirm = useConfirm();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const {
    isEnabled,
    lastBackupAt,
    status,
    message,
    isBusy,
    conflict,
    setEnabled,
    backupNow,
    restoreNow,
    resolveConflict,
    cancelConflict,
    syncNow,
  } = backup;

  const statusTone = useMemo(() => {
    if (status === "error") return "text-red-600 dark:text-red-400";
    if (status === "success") return "text-emerald-600 dark:text-emerald-400";
    return "text-zinc-600 dark:text-zinc-400";
  }, [status]);

  const handleSignOutOthers = async () => {
    const ok = await confirm({
      title: "Sign out all other devices?",
      description:
        "Other devices will stop syncing immediately and must reconnect to resume.",
    });
    if (!ok) return;
    setIsSigningOut(true);
    try {
      await device.signOutOtherDevices();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 pt-32 dark:bg-zinc-950">
      <div className="container mx-auto max-w-3xl px-4">
        <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Cloud className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h1 className="text-2xl font-bold">Cloud backup</h1>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Optionally back up your reviews, drafts, bookmarks and settings so you can restore
            them on another device.
          </p>
        </header>

        {!publicKey && (
          <Card variant="outline" className="mb-6 border-amber-300 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Connect your wallet to enable cloud backup. Your wallet address is used to derive
              the encryption key.
            </p>
          </Card>
        )}

        {/* Privacy notice */}
        <Card className="mb-6">
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Your data stays private
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Backups are encrypted on your device before they leave it. Dongle stores only the
                encrypted blob and cannot read it — your reviews, drafts, bookmarks and settings
                are not visible to admins.
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Learn more in our{" "}
                <Link href="/privacy" className="font-medium underline">
                  privacy notice
                </Link>
                .
              </p>
            </div>
          </div>
        </Card>

        {/* Opt-in + controls */}
        <Card className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Enable cloud backup
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Automatically syncs every {Math.round(AUTO_SYNC_INTERVAL_MS / 60000)} minutes
                while enabled.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              aria-label="Enable cloud backup"
              disabled={!publicKey}
              onClick={() => setEnabled(!isEnabled)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  isEnabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    isEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800 sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Last backup</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {formatTimestamp(lastBackupAt)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
              <dd className={`font-medium ${statusTone}`}>
                {isBusy ? "Working..." : message || (isEnabled ? "On" : "Off")}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <Button
              size="sm"
              leftIcon={<CloudUpload className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void backupNow()}
              isLoading={status === "backing-up"}
              loadingText="Backing up..."
              disabled={!publicKey || isBusy}
            >
              Back up now
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<CloudDownload className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void restoreNow()}
              isLoading={status === "restoring"}
              loadingText="Restoring..."
              disabled={!publicKey || isBusy}
            >
              Restore from cloud
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void syncNow()}
              disabled={!publicKey || isBusy || !isEnabled}
            >
              Sync now
            </Button>
          </div>
        </Card>

        {/* Devices & real-time sync */}
        <Card className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Devices &amp; sync
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Bookmark and draft changes sync to your other devices in real time.
              </p>
            </div>
            <SyncStatusIndicator
              status={device.status}
              pendingCount={device.pendingCount}
              className="mt-0.5 shrink-0"
            />
          </div>

          <div className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            {device.status === "offline" && device.pendingCount > 0 && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                You&apos;re offline. {device.pendingCount} change
                {device.pendingCount === 1 ? "" : "s"} queued and will sync automatically when
                your connection returns.
              </p>
            )}
            <DeviceList
              devices={device.devices}
              isSigningOut={isSigningOut}
              onRefresh={() => void device.refreshDevices()}
              onSignOutOthers={
                publicKey && device.devices.some((entry) => !entry.isCurrent)
                  ? () => void handleSignOutOthers()
                  : undefined
              }
            />
          </div>
        </Card>

        {/* What gets backed up */}
        <Card variant="outline">
          <div className="flex items-start gap-3">
            <Lock
              className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                What gets backed up
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                <li>Your reviews and owner responses</li>
                <li>Project drafts and review drafts</li>
                <li>Bookmarks and watchlist</li>
                <li>App settings (theme and language)</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Live region for status updates */}
        <p className="sr-only" role="status" aria-live="polite">
          {isBusy ? "Working" : message}
        </p>
      </div>
      {conflict && (
        <BackupConflictDialog
          conflict={conflict}
          isBusy={isBusy}
          onResolve={(choices) => void resolveConflict(choices)}
          onCancel={cancelConflict}
        />
      )}
    </div>
  );
}
