import type { Project } from "@/types/project";

export interface ComparisonHistoryEntry {
  id: string;
  createdAt: string;
  userAddress: string | null;
  projectIds: string[];
  projectSnapshots: Project[];
  summary: Array<{
    id: string;
    name: string;
    category: string;
    rating: number;
    reviews: number;
  }>;
}

const MAX_HISTORY_ITEMS = 20;
const STORAGE_PREFIX = "dongle_compare_history";

function getStorageKey(userAddress?: string | null): string {
  const key = userAddress?.trim() || "guest";
  return `${STORAGE_PREFIX}_${key}`;
}

function readHistory(userAddress?: string | null): ComparisonHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(userAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ComparisonHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(history: ComparisonHistoryEntry[], userAddress?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(userAddress), JSON.stringify(history));
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getComparisonHistory(userAddress?: string | null): ComparisonHistoryEntry[] {
  return readHistory(userAddress);
}

export function saveComparisonSnapshot(projects: Project[], userAddress?: string | null): ComparisonHistoryEntry | null {
  if (projects.length < 2) return null;

  const normalizedProjectIds = [...new Set(projects.map((project) => project.id))];
  if (normalizedProjectIds.length < 2) return null;

  const entry: ComparisonHistoryEntry = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    userAddress: userAddress ?? null,
    projectIds: normalizedProjectIds,
    projectSnapshots: projects.map((project) => ({
      ...project,
      tags: [...(project.tags ?? [])],
    })),
    summary: projects.map((project) => ({
      id: project.id,
      name: project.name,
      category: project.primaryCategory,
      rating: project.rating,
      reviews: project.reviews,
    })),
  };

  const history = readHistory(userAddress);
  const deduped = history.filter((item) => item.projectIds.join(",") !== entry.projectIds.join(","));
  const nextHistory = [entry, ...deduped].slice(0, MAX_HISTORY_ITEMS);
  writeHistory(nextHistory, userAddress);
  return entry;
}

export function deleteComparisonHistoryEntry(entryId: string, userAddress?: string | null): void {
  const history = readHistory(userAddress).filter((entry) => entry.id !== entryId);
  writeHistory(history, userAddress);
}

export function buildComparisonPermalink(projectIds: string[], baseUrl?: string): string {
  const ids = [...new Set(projectIds.filter(Boolean))].join(",");
  if (typeof window !== "undefined") {
    const origin = baseUrl ?? window.location.origin;
    return `${origin}/compare?ids=${encodeURIComponent(ids)}`;
  }
  return `/compare?ids=${encodeURIComponent(ids)}`;
}

export function getComparisonProjectIdsFromQuery(idsParam: string | null): string[] {
  if (!idsParam) return [];
  return [...new Set(idsParam.split(",").map((id) => id.trim()).filter(Boolean))];
}
