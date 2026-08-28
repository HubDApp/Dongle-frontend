"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useDataSyncStatus } from "@/hooks/useDataSyncStatus";
import OfflineBanner from "@/components/ui/OfflineBanner";
import { toast } from "sonner";
import type { SyncUiStatus } from "@/lib/data-layer";
import { startAutomaticSync } from "@/lib/data-layer";

interface OnlineStatusContextValue {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  wasOffline: boolean;
  checkConnectivity: () => Promise<void>;
  syncStatus: SyncUiStatus;
  pendingCount: number;
  lastSyncError: string | null;
  retrySync: () => void;
}

const OnlineStatusContext = createContext<OnlineStatusContextValue | undefined>(undefined);

interface OnlineStatusProviderProps {
  children: ReactNode;
  showBanner?: boolean;
  showToast?: boolean;
  checkInterval?: number;
  pingUrl?: string;
}

export function OnlineStatusProvider({
  children,
  showBanner = true,
  showToast = true,
  checkInterval,
  pingUrl,
}: OnlineStatusProviderProps) {
  const status = useOnlineStatus({
    checkInterval,
    pingUrl,
    onOnline: () => {
      if (showToast) {
        toast.success("You're back online!", {
          description: "Connection restored",
        });
      }
    },
    onOffline: () => {
      if (showToast) {
        toast.error("You're offline", {
          description: "Please check your internet connection",
        });
      }
    },
  });

  const sync = useDataSyncStatus();

  useEffect(() => {
    return startAutomaticSync();
  }, []);

  const value: OnlineStatusContextValue = {
    isOnline: status.isOnline,
    isChecking: status.isChecking,
    lastCheck: status.lastCheck,
    wasOffline: status.wasOffline,
    checkConnectivity: status.checkConnectivity,
    syncStatus: sync.syncStatus,
    pendingCount: sync.pendingCount,
    lastSyncError: sync.lastError,
    retrySync: sync.retrySync,
  };

  return (
    <OnlineStatusContext.Provider value={value}>
      {showBanner && (
        <OfflineBanner
          isOnline={status.isOnline}
          wasOffline={status.wasOffline}
          isChecking={status.isChecking}
          syncStatus={sync.syncStatus}
          pendingCount={sync.pendingCount}
          onRetry={sync.retrySync}
          position="top"
        />
      )}
      {children}
    </OnlineStatusContext.Provider>
  );
}

/**
 * Hook to access online status from any component
 *
 * @example
 * ```tsx
 * const { isOnline, checkConnectivity } = useOnlineStatusContext();
 *
 * if (!isOnline) {
 *   return <div>Offline mode</div>;
 * }
 * ```
 */
export function useOnlineStatusContext() {
  const context = useContext(OnlineStatusContext);
  if (context === undefined) {
    throw new Error("useOnlineStatusContext must be used within OnlineStatusProvider");
  }
  return context;
}
