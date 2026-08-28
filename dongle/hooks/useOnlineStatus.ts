"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  setOnline,
  startConnectivityMonitor,
  subscribeConnectivity,
} from "@/lib/data-layer";

interface UseOnlineStatusOptions {
  onOnline?: () => void;
  onOffline?: () => void;
  checkInterval?: number;
  pingUrl?: string;
}

interface OnlineStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  wasOffline: boolean;
}

/**
 * Hook to detect and monitor online/offline status.
 *
 * Uses the shared connectivity monitor (navigator.onLine + events) plus
 * optional periodic HTTP ping checks.
 */
export function useOnlineStatus(options: UseOnlineStatusOptions = {}) {
  const { onOnline, onOffline, checkInterval, pingUrl } = options;
  const onOnlineRef = useRef(onOnline);
  const onOfflineRef = useRef(onOffline);

  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isChecking: false,
    lastCheck: null,
    wasOffline: false,
  });

  const checkConnectivity = useCallback(async () => {
    if (!pingUrl) return;

    setStatus((prev) => ({ ...prev, isChecking: true }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(pingUrl, {
        method: "HEAD",
        cache: "no-cache",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setOnline(true);
      setStatus((prev) => ({
        isOnline: true,
        isChecking: false,
        lastCheck: new Date(),
        wasOffline: !prev.isOnline,
      }));
    } catch {
      setOnline(false);
      setStatus({
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        wasOffline: false,
      });
    }
  }, [pingUrl]);

  useEffect(() => {
    onOnlineRef.current = onOnline;
    onOfflineRef.current = onOffline;
  }, [onOnline, onOffline]);

  useEffect(() => {
    startConnectivityMonitor();

    const unsubscribe = subscribeConnectivity((online) => {
      setStatus((prev) => {
        const comingOnline = online && !prev.isOnline;
        const goingOffline = !online && prev.isOnline;
        if (comingOnline) onOnlineRef.current?.();
        if (goingOffline) onOfflineRef.current?.();
        return {
          isOnline: online,
          isChecking: false,
          lastCheck: new Date(),
          wasOffline: comingOnline,
        };
      });
    });

    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (checkInterval && pingUrl) {
      intervalId = setInterval(() => {
        void checkConnectivity();
      }, checkInterval);
    }

    return () => {
      unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [checkInterval, checkConnectivity, pingUrl]);

  return {
    ...status,
    checkConnectivity,
  };
}
