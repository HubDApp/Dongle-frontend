"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@/context/wallet.context";

const STORAGE_PREFIX = "dongle_saved_projects:";
const SAVED_PROJECTS_EVENT = "dongle:saved-projects-changed";

function getStorageKey(walletAddress: string) {
  return `${STORAGE_PREFIX}${walletAddress}`;
}

function readSavedProjectIds(walletAddress: string | null): string[] {
  if (typeof window === "undefined" || !walletAddress) {
    return [];
  }

  try {
    const raw = localStorage.getItem(getStorageKey(walletAddress));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch (error) {
    console.error("Failed to read saved projects:", error);
    return [];
  }
}

function writeSavedProjectIds(walletAddress: string, projectIds: string[]) {
  localStorage.setItem(getStorageKey(walletAddress), JSON.stringify(projectIds));
}

function emitSavedProjectsChanged(walletAddress: string | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(SAVED_PROJECTS_EVENT, {
      detail: { walletAddress },
    }),
  );
}

export function useSavedProjects() {
  const { publicKey, isConnected } = useWallet();
  const [savedProjectIds, setSavedProjectIds] = useState<string[]>(() =>
    readSavedProjectIds(publicKey),
  );

  useEffect(() => {
    setSavedProjectIds(readSavedProjectIds(publicKey));
  }, [publicKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (!publicKey) return;
      if (event.key !== getStorageKey(publicKey)) return;
      setSavedProjectIds(readSavedProjectIds(publicKey));
    };

    const handleSavedProjectsChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ walletAddress?: string | null }>;
      if (customEvent.detail?.walletAddress && customEvent.detail.walletAddress !== publicKey) {
        return;
      }
      setSavedProjectIds(readSavedProjectIds(publicKey));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SAVED_PROJECTS_EVENT, handleSavedProjectsChanged as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        SAVED_PROJECTS_EVENT,
        handleSavedProjectsChanged as EventListener,
      );
    };
  }, [publicKey]);

  const isProjectSaved = useCallback(
    (projectId: string) => savedProjectIds.includes(projectId),
    [savedProjectIds],
  );

  const toggleSavedProject = useCallback(
    (projectId: string) => {
      if (!publicKey) return false;

      const nextProjectIds = savedProjectIds.includes(projectId)
        ? savedProjectIds.filter((id) => id !== projectId)
        : [...savedProjectIds, projectId];

      writeSavedProjectIds(publicKey, nextProjectIds);
      setSavedProjectIds(nextProjectIds);
      emitSavedProjectsChanged(publicKey);
      return nextProjectIds.includes(projectId);
    },
    [publicKey, savedProjectIds],
  );

  const clearSavedProjects = useCallback(() => {
    if (!publicKey) return;

    writeSavedProjectIds(publicKey, []);
    setSavedProjectIds([]);
    emitSavedProjectsChanged(publicKey);
  }, [publicKey]);

  return useMemo(
    () => ({
      walletAddress: publicKey,
      isConnected,
      savedProjectIds,
      isProjectSaved,
      toggleSavedProject,
      clearSavedProjects,
      canManageSavedProjects: Boolean(publicKey && isConnected),
    }),
    [
      publicKey,
      isConnected,
      savedProjectIds,
      isProjectSaved,
      toggleSavedProject,
      clearSavedProjects,
    ],
  );
}