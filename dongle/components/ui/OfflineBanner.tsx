"use client";

import { WifiOff, Wifi, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface OfflineBannerProps {
  isOnline: boolean;
  wasOffline?: boolean;
  showRecoveryMessage?: boolean;
  position?: "top" | "bottom";
  compact?: boolean;
}

export default function OfflineBanner({
  isOnline,
  wasOffline = false,
  showRecoveryMessage = true,
  position = "top",
  compact = false,
}: OfflineBannerProps) {
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (wasOffline && isOnline && showRecoveryMessage) {
      setShowRecovery(true);
      const timer = setTimeout(() => setShowRecovery(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline, showRecoveryMessage]);

  // Show recovery message
  if (showRecovery && isOnline) {
    return (
      <div
        className={`fixed ${position === "top" ? "top-0" : "bottom-0"} left-0 right-0 z-50 bg-green-600 text-white transition-transform duration-300`}
        role="status"
        aria-live="polite"
      >
        <div className="container mx-auto px-4">
          <div className={`flex items-center justify-center gap-3 ${compact ? "py-2" : "py-3"}`}>
            <Wifi className={compact ? "w-4 h-4" : "w-5 h-5"} />
            <p className={compact ? "text-sm font-medium" : "text-base font-semibold"}>
              You're back online!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show offline message
  if (!isOnline) {
    return (
      <div
        className={`fixed ${position === "top" ? "top-0" : "bottom-0"} left-0 right-0 z-50 bg-red-600 text-white shadow-lg transition-transform duration-300`}
        role="alert"
        aria-live="assertive"
      >
        <div className="container mx-auto px-4">
          <div className={`flex items-center justify-center gap-3 ${compact ? "py-2" : "py-3"}`}>
            <WifiOff className={compact ? "w-4 h-4" : "w-5 h-5"} />
            <div className="flex-1 min-w-0">
              <p className={compact ? "text-sm font-medium" : "text-base font-semibold"}>
                You're offline
              </p>
              {!compact && (
                <p className="text-xs text-red-100 mt-0.5">
                  Some features may not work. Please check your internet connection.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Inline warning component for sections that require network
 */
export function OfflineWarning({ message, compact = false }: { message?: string; compact?: boolean }) {
  return (
    <div
      className={`flex items-start gap-3 ${compact ? "p-3" : "p-4"} rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50`}
      role="alert"
    >
      <AlertTriangle className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-amber-500 dark:text-amber-400 mt-0.5 shrink-0`} />
      <div>
        <p className={`${compact ? "text-sm" : "text-base"} font-medium text-amber-800 dark:text-amber-300`}>
          {message || "This feature requires an internet connection"}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          Please connect to the internet to continue.
        </p>
      </div>
    </div>
  );
}
