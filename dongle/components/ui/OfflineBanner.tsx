"use client";

import { WifiOff, Wifi, AlertTriangle, RefreshCw, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { SyncUiStatus } from "@/lib/data-layer";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface OfflineBannerProps {
  isOnline?: boolean;
  /** @deprecated Prefer isOnline; kept for existing callers/tests. */
  isOffline?: boolean;
  wasOffline?: boolean;
  showRecoveryMessage?: boolean;
  position?: "top" | "bottom";
  compact?: boolean;
  isChecking?: boolean;
  syncStatus?: SyncUiStatus;
  pendingCount?: number;
  onRetry?: () => void;
}

function resolveOnline(isOnline?: boolean, isOffline?: boolean): boolean {
  if (typeof isOnline === "boolean") return isOnline;
  if (typeof isOffline === "boolean") return !isOffline;
  return true;
}

export default function OfflineBanner({
  isOnline,
  isOffline,
  wasOffline = false,
  showRecoveryMessage = true,
  position = "top",
  compact = false,
  isChecking = false,
  syncStatus,
  pendingCount = 0,
  onRetry,
}: OfflineBannerProps) {
  const { t } = useTranslation();
  const online = resolveOnline(isOnline, isOffline);
  const recoveryKey = wasOffline && online && showRecoveryMessage ? "on" : "off";
  const [recoveryHidden, setRecoveryHidden] = useState(false);

  const displayStatus: SyncUiStatus = !online
    ? "offline"
    : isChecking && syncStatus !== "syncing"
      ? "reconnecting"
      : syncStatus ?? "idle";

  useEffect(() => {
    if (recoveryKey !== "on") return undefined;
    const reveal = window.setTimeout(() => setRecoveryHidden(false), 0);
    const hide = window.setTimeout(() => setRecoveryHidden(true), 3000);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(hide);
    };
  }, [recoveryKey]);

  const showRecovery = recoveryKey === "on" && !recoveryHidden;

  const positionClass = position === "top" ? "top-0" : "bottom-0";
  const padding = compact ? "py-2" : "py-3";
  const iconSize = compact ? "w-4 h-4" : "w-5 h-5";

  if (displayStatus === "offline") {
    return (
      <div
        className={`fixed ${positionClass} left-0 right-0 z-50 bg-red-600 text-white shadow-lg transition-transform duration-300`}
        role="alert"
        aria-live="assertive"
      >
        <div className="container mx-auto px-4">
          <div className={`flex items-center justify-center gap-3 ${padding}`}>
            <WifiOff className={iconSize} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className={compact ? "text-sm font-medium" : "text-base font-semibold"}>
                {t("sync.offline")}
              </p>
              {!compact && (
                <p className="text-xs text-red-100 mt-0.5">
                  {pendingCount > 0
                    ? t("sync.pendingCount", { count: pendingCount })
                    : t("sync.offlineHint")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (displayStatus === "reconnecting") {
    return (
      <div
        className={`fixed ${positionClass} left-0 right-0 z-50 bg-amber-600 text-white shadow-lg`}
        role="status"
        aria-live="polite"
      >
        <div className="container mx-auto px-4">
          <div className={`flex items-center justify-center gap-3 ${padding}`}>
            <Loader2 className={`${iconSize} animate-spin`} aria-hidden="true" />
            <p className={compact ? "text-sm font-medium" : "text-base font-semibold"}>
              {t("sync.reconnecting")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (displayStatus === "syncing") {
    return (
      <div
        className={`fixed ${positionClass} left-0 right-0 z-50 bg-blue-600 text-white shadow-lg`}
        role="status"
        aria-live="polite"
      >
        <div className="container mx-auto px-4">
          <div className={`flex items-center justify-center gap-3 ${padding}`}>
            <RefreshCw className={`${iconSize} animate-spin`} aria-hidden="true" />
            <p className={compact ? "text-sm font-medium" : "text-base font-semibold"}>
              {t("sync.syncing")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (displayStatus === "failed") {
    return (
      <div
        className={`fixed ${positionClass} left-0 right-0 z-50 bg-amber-700 text-white shadow-lg`}
        role="alert"
        aria-live="assertive"
      >
        <div className="container mx-auto px-4">
          <div className={`flex items-center justify-center gap-3 ${padding}`}>
            <AlertTriangle className={iconSize} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className={compact ? "text-sm font-medium" : "text-base font-semibold"}>
                {t("sync.failed")}
              </p>
              {!compact && (
                <p className="text-xs text-amber-100 mt-0.5">{t("sync.failedHint")}</p>
              )}
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="shrink-0 rounded-md bg-white/15 px-3 py-1 text-sm font-medium hover:bg-white/25"
              >
                {t("sync.retry")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if ((showRecovery && online) || displayStatus === "synced") {
    return (
      <div
        className={`fixed ${positionClass} left-0 right-0 z-50 bg-green-600 text-white transition-transform duration-300`}
        role="status"
        aria-live="polite"
      >
        <div className="container mx-auto px-4">
          <div className={`flex items-center justify-center gap-3 ${padding}`}>
            {displayStatus === "synced" ? (
              <Check className={iconSize} aria-hidden="true" />
            ) : (
              <Wifi className={iconSize} aria-hidden="true" />
            )}
            <p className={compact ? "text-sm font-medium" : "text-base font-semibold"}>
              {displayStatus === "synced" ? t("sync.synced") : t("sync.backOnline")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export { OfflineBanner };

/**
 * Inline warning component for sections that require network
 */
export function OfflineWarning({ message, compact = false }: { message?: string; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex items-start gap-3 ${compact ? "p-3" : "p-4"} rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50`}
      role="alert"
    >
      <AlertTriangle className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-amber-500 dark:text-amber-400 mt-0.5 shrink-0`} />
      <div>
        <p className={`${compact ? "text-sm" : "text-base"} font-medium text-amber-800 dark:text-amber-300`}>
          {message || t("sync.offlineHint")}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          {t("sync.requiresConnection")}
        </p>
      </div>
    </div>
  );
}
