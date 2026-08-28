"use client";

import { useState, useEffect, useCallback } from "react";

interface UseOnlineStatusOptions {
  onOnline?: () => void;
  onOffline?: () => void;
  checkInterval?: number; // ms between connectivity checks
  pingUrl?: string; // URL to ping for connectivity check
}

interface OnlineStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  wasOffline: boolean; // True if we were offline and just came back
}

/**
 * Hook to detect and monitor online/offline status
 * 
 * Uses multiple detection methods:
 * 1. Browser navigator.onLine API
 * 2. Online/offline event listeners
 * 3. Optional periodic connectivity checks
 * 
 * @example
 * ```tsx
 * const { isOnline, isChecking } = useOnlineStatus({
 *   onOffline: () => toast.error("You're offline"),
 *   onOnline: () => toast.success("You're back online"),
 * });
 * ```
 */
export function useOnlineStatus(options: UseOnlineStatusOptions = {}) {
  const {
    onOnline,
    onOffline,
    checkInterval,
    pingUrl,
  } = options;

  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isChecking: false,
    lastCheck: null,
    wasOffline: false,
  });

  // Active connectivity check via fetch
  const checkConnectivity = useCallback(async () => {
    if (!pingUrl) return;

    setStatus(prev => ({ ...prev, isChecking: true }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(pingUrl, {
        method: "HEAD",
        cache: "no-cache",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      setStatus(prev => ({
        isOnline: true,
        isChecking: false,
        lastCheck: new Date(),
        wasOffline: !prev.isOnline,
      }));
    } catch (error) {
      setStatus(prev => ({
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        wasOffline: false,
      }));
    }
  }, [pingUrl]);

  useEffect(() => {
    // Initialize
    setStatus({
      isOnline: navigator.onLine,
      isChecking: false,
      lastCheck: null,
      wasOffline: false,
    });

    // Handle online event
    const handleOnline = () => {
      setStatus(prev => ({
        isOnline: true,
        isChecking: false,
        lastCheck: new Date(),
        wasOffline: !prev.isOnline,
      }));
      onOnline?.();
    };

    // Handle offline event
    const handleOffline = () => {
      setStatus({
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        wasOffline: false,
      });
      onOffline?.();
    };

    // Listen to browser events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Optional: periodic connectivity check
    let intervalId: NodeJS.Timeout | undefined;
    if (checkInterval && pingUrl) {
      intervalId = setInterval(checkConnectivity, checkInterval);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalId) clearInterval(intervalId);
    };
  }, [onOnline, onOffline, checkInterval, checkConnectivity, pingUrl]);

  return {
    ...status,
    checkConnectivity,
  };
}
