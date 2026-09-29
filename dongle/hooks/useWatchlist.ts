"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@/context/wallet.context";
import { MAX_WATCHLIST_SIZE } from "@/constants/limits";
import { projectService } from "@/services/project/project.service";
import type { Project } from "@/types/project";
import {
  notifyWatchlistEvent,
  type WatchlistNotificationType,
} from "@/services/watchlist/watchlist-notification.service";

const STORAGE_PREFIX = "dongle_watchlist:";
const WATCHLIST_EVENT = "dongle:watchlist-changed";

function getStorageKey(walletAddress: string) {
  return `${STORAGE_PREFIX}${walletAddress}`;
}

function readWatchlistIds(walletAddress: string | null): string[] {
  if (typeof window === "undefined" || !walletAddress) return [];

  try {
    const raw = localStorage.getItem(getStorageKey(walletAddress));
    if (!raw) {
      const legacy = localStorage.getItem(`dongle_saved_projects:${walletAddress}`);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((id): id is string => typeof id === "string")
            .slice(0, MAX_WATCHLIST_SIZE);
        }
      }
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_WATCHLIST_SIZE);
  } catch {
    return [];
  }
}

function writeWatchlistIds(walletAddress: string, projectIds: string[]) {
  localStorage.setItem(
    getStorageKey(walletAddress),
    JSON.stringify(projectIds.slice(0, MAX_WATCHLIST_SIZE)),
  );
}

function emitWatchlistChanged(walletAddress: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WATCHLIST_EVENT, { detail: { walletAddress } }),
  );
}

export function useWatchlist() {
  const { publicKey, isConnected } = useWallet();
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() =>
    readWatchlistIds(publicKey),
  );

  useEffect(() => {
    const id = setTimeout(() => setWatchlistIds(readWatchlistIds(publicKey)), 0);
    return () => clearTimeout(id);
  }, [publicKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (!publicKey || event.key !== getStorageKey(publicKey)) return;
      setWatchlistIds(readWatchlistIds(publicKey));
    };

    const handleChanged = (event: Event) => {
      const custom = event as CustomEvent<{ walletAddress?: string | null }>;
      if (custom.detail?.walletAddress && custom.detail.walletAddress !== publicKey) return;
      setWatchlistIds(readWatchlistIds(publicKey));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(WATCHLIST_EVENT, handleChanged as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(WATCHLIST_EVENT, handleChanged as EventListener);
    };
  }, [publicKey]);

  const isOnWatchlist = useCallback(
    (projectId: string) => watchlistIds.includes(projectId),
    [watchlistIds],
  );

  const addToWatchlist = useCallback(
    (projectId: string): { success: boolean; error?: string } => {
      if (!publicKey) return { success: false, error: "Connect wallet to use watchlist" };
      if (watchlistIds.includes(projectId)) return { success: true };
      if (watchlistIds.length >= MAX_WATCHLIST_SIZE) {
        return { success: false, error: `Watchlist limit reached (${MAX_WATCHLIST_SIZE})` };
      }

      const next = [...watchlistIds, projectId];
      writeWatchlistIds(publicKey, next);
      setWatchlistIds(next);
      emitWatchlistChanged(publicKey);
      notifyWatchlistEvent(projectId, "added");
      return { success: true };
    },
    [publicKey, watchlistIds],
  );

  const removeFromWatchlist = useCallback(
    (projectId: string) => {
      if (!publicKey) return;
      const next = watchlistIds.filter((id) => id !== projectId);
      writeWatchlistIds(publicKey, next);
      setWatchlistIds(next);
      emitWatchlistChanged(publicKey);
      notifyWatchlistEvent(projectId, "removed");
    },
    [publicKey, watchlistIds],
  );

  const toggleWatchlist = useCallback(
    (projectId: string) => {
      if (isOnWatchlist(projectId)) {
        removeFromWatchlist(projectId);
        return false;
      }
      const result = addToWatchlist(projectId);
      return result.success;
    },
    [addToWatchlist, isOnWatchlist, removeFromWatchlist],
  );

  const watchlistProjects = useMemo(
    () =>
      watchlistIds
        .map((id) => projectService.getProjectById(id))
        .filter((p): p is Project => Boolean(p)),
    [watchlistIds],
  );

  const filterByCategory = useCallback(
    (category: string) => {
      if (category === "All") return watchlistProjects;
      return watchlistProjects.filter((p) => p.primaryCategory === category);
    },
    [watchlistProjects],
  );

  const trendingFromWatchlist = useMemo(() => {
    return [...watchlistProjects]
      .sort((a, b) => b.reviews - a.reviews || b.rating - a.rating)
      .slice(0, 5);
  }, [watchlistProjects]);

  const triggerNotification = useCallback(
    (projectId: string, type: WatchlistNotificationType, message: string) => {
      if (!isOnWatchlist(projectId)) return;
      notifyWatchlistEvent(projectId, type, message);
    },
    [isOnWatchlist],
  );

  return useMemo(
    () => ({
      walletAddress: publicKey,
      isConnected,
      watchlistIds,
      watchlistCount: watchlistIds.length,
      maxWatchlistSize: MAX_WATCHLIST_SIZE,
      isOnWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      watchlistProjects,
      filterByCategory,
      trendingFromWatchlist,
      triggerNotification,
      canManageWatchlist: Boolean(publicKey && isConnected),
      isAtLimit: watchlistIds.length >= MAX_WATCHLIST_SIZE,
    }),
    [
      publicKey,
      isConnected,
      watchlistIds,
      isOnWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      watchlistProjects,
      filterByCategory,
      trendingFromWatchlist,
      triggerNotification,
    ],
  );
}
