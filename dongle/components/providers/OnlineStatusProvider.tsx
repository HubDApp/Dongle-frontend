"use client";

import { createContext, useContext, ReactNode } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import OfflineBanner from "@/components/ui/OfflineBanner";
import { toast } from "sonner";

interface OnlineStatusContextValue {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  wasOffline: boolean;
  checkConnectivity: () => Promise<void>;
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

  return (
    <OnlineStatusContext.Provider value={status}>
      {showBanner && (
        <OfflineBanner
          isOnline={status.isOnline}
          wasOffline={status.wasOffline}
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
