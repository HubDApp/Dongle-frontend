"use client";

/**
 * DeviceList
 *
 * Lists the devices enrolled in sync for the wallet, marks the current one, and
 * exposes the "Sign out all other devices" action.
 */

import { Laptop, LogOut, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { SyncDeviceView } from "@/services/sync/device-sync.service";

export interface DeviceListProps {
  devices: SyncDeviceView[];
  isLoading?: boolean;
  isSigningOut?: boolean;
  onRefresh?: () => void;
  onSignOutOthers?: () => void;
}

function formatLastSeen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function isMobile(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("iphone") || lower.includes("ipad") || lower.includes("android");
}

export function DeviceList({
  devices,
  isLoading = false,
  isSigningOut = false,
  onRefresh,
  onSignOutOthers,
}: DeviceListProps) {
  const others = devices.filter((device) => !device.isCurrent);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Active devices ({devices.length})
        </h2>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh device list"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} aria-hidden="true" />
            Refresh
          </button>
        )}
      </div>

      {devices.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {isLoading ? "Loading devices…" : "No devices enrolled yet."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
          {devices.map((device) => {
            const Icon = isMobile(device.label) ? Smartphone : Laptop;
            return (
              <li key={device.deviceId} className="flex items-center gap-3 py-3">
                <Icon className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {device.label}
                    {device.isCurrent && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    Last active {formatLastSeen(device.lastSeenAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    device.online ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600",
                  )}
                  title={device.online ? "Online" : "Offline"}
                  aria-label={device.online ? "Online" : "Offline"}
                />
              </li>
            );
          })}
        </ul>
      )}

      {onSignOutOthers && (
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
            onClick={onSignOutOthers}
            isLoading={isSigningOut}
            loadingText="Signing out…"
            disabled={others.length === 0}
          >
            Sign out all other devices
          </Button>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {others.length === 0
              ? "There are no other devices signed in."
              : `Revokes sync access for ${others.length} other device${others.length === 1 ? "" : "s"}.`}
          </p>
        </div>
      )}
    </div>
  );
}
