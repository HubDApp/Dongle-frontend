import { MAX_SAVED_SEARCHES } from "@/constants/limits";
import type { SavedSearch } from "@/types/search";
import type { AdvancedSearchFilters } from "@/types/search";

const STORAGE_PREFIX = "dongle_saved_searches:";

function getStorageKey(walletAddress: string) {
  return `${STORAGE_PREFIX}${walletAddress}`;
}

function readSearches(walletAddress: string): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSearches(walletAddress: string, searches: SavedSearch[]) {
  localStorage.setItem(
    getStorageKey(walletAddress),
    JSON.stringify(searches.slice(0, MAX_SAVED_SEARCHES)),
  );
}

export const savedSearchService = {
  getSavedSearches(walletAddress: string): SavedSearch[] {
    return readSearches(walletAddress);
  },

  saveSearch(
    walletAddress: string,
    name: string,
    filters: Omit<AdvancedSearchFilters, "page">,
  ): { success: boolean; data?: SavedSearch; error?: string } {
    const existing = readSearches(walletAddress);
    if (existing.length >= MAX_SAVED_SEARCHES) {
      return {
        success: false,
        error: `Maximum ${MAX_SAVED_SEARCHES} saved searches allowed`,
      };
    }

    const now = new Date().toISOString();
    const entry: SavedSearch = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filters,
      createdAt: now,
      updatedAt: now,
    };

    writeSearches(walletAddress, [entry, ...existing]);
    return { success: true, data: entry };
  },

  deleteSearch(walletAddress: string, searchId: string): boolean {
    const next = readSearches(walletAddress).filter((s) => s.id !== searchId);
    if (next.length === readSearches(walletAddress).length) return false;
    writeSearches(walletAddress, next);
    return true;
  },

  updateSearch(
    walletAddress: string,
    searchId: string,
    updates: Partial<Pick<SavedSearch, "name" | "filters">>,
  ): SavedSearch | null {
    const searches = readSearches(walletAddress);
    const index = searches.findIndex((s) => s.id === searchId);
    if (index === -1) return null;

    searches[index] = {
      ...searches[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeSearches(walletAddress, searches);
    return searches[index];
  },

  exportSearches(walletAddress: string): string {
    return JSON.stringify(readSearches(walletAddress), null, 2);
  },

  importSearches(
    walletAddress: string,
    json: string,
  ): { success: boolean; imported: number; error?: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return { success: false, imported: 0, error: "Invalid JSON file" };
    }
    if (!Array.isArray(parsed)) {
      return { success: false, imported: 0, error: "Expected an array of saved searches" };
    }
    const existing = readSearches(walletAddress);
    const names = new Set(existing.map((s) => s.name.toLowerCase()));
    const now = new Date().toISOString();
    const incoming: SavedSearch[] = parsed
      .filter(
        (s): s is SavedSearch =>
          !!s && typeof s === "object" && typeof s.name === "string" &&
          !!s.name.trim() && typeof s.filters === "object" && s.filters !== null,
      )
      .filter((s) => !names.has(s.name.toLowerCase()))
      .map((s) => ({
        id: crypto.randomUUID(),
        name: s.name.trim(),
        filters: s.filters,
        createdAt: s.createdAt || now,
        updatedAt: now,
      }));
    const room = Math.max(0, MAX_SAVED_SEARCHES - existing.length);
    const accepted = incoming.slice(0, room);
    writeSearches(walletAddress, [...existing, ...accepted]);
    return {
      success: true,
      imported: accepted.length,
      error:
        incoming.length > room
          ? `Only ${room} imported — maximum ${MAX_SAVED_SEARCHES} saved searches allowed`
          : undefined,
    };
  },
};
