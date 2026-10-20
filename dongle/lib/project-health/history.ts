/**
 * Weekly health score snapshots (Issue #671).
 *
 * One snapshot per project per ISO week (weeks start Monday, UTC). Recording
 * again within the same week overwrites that week's value, so the history is a
 * stable weekly series regardless of how often a page is viewed. Snapshots are
 * kept in localStorage and capped at a year per project.
 */

export interface HealthSnapshot {
  /** Monday of the snapshot's week, `YYYY-MM-DD` (UTC). */
  week: string;
  score: number;
}

type SnapshotStore = Record<string, HealthSnapshot[]>;

export const HEALTH_SNAPSHOT_STORAGE_KEY = "dongle_health_snapshots";
export const MAX_SNAPSHOTS_PER_PROJECT = 52;

/** Monday 00:00 UTC of the week containing `date`, formatted `YYYY-MM-DD`. */
export function weekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function isSnapshot(value: unknown): value is HealthSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.week === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.week) &&
    typeof v.score === "number" &&
    Number.isFinite(v.score)
  );
}

function readStore(): SnapshotStore {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(HEALTH_SNAPSHOT_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const store: SnapshotStore = {};
    for (const [id, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(list)) store[id] = list.filter(isSnapshot);
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: SnapshotStore): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HEALTH_SNAPSHOT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or unavailable — snapshots are best-effort.
  }
}

function upsert(list: HealthSnapshot[], snapshot: HealthSnapshot): HealthSnapshot[] {
  const next = list.filter((s) => s.week !== snapshot.week);
  next.push(snapshot);
  next.sort((a, b) => a.week.localeCompare(b.week));
  return next.slice(-MAX_SNAPSHOTS_PER_PROJECT);
}

/** Records this week's score for each project in a single storage write. */
export function recordHealthSnapshots(
  scores: Record<string, number>,
  now: Date = new Date(),
): void {
  const ids = Object.keys(scores);
  if (ids.length === 0) return;
  const store = readStore();
  const week = weekStart(now);
  for (const id of ids) {
    store[id] = upsert(store[id] ?? [], { week, score: Math.round(scores[id]) });
  }
  writeStore(store);
}

export function recordHealthSnapshot(projectId: string, score: number, now: Date = new Date()): void {
  recordHealthSnapshots({ [projectId]: score }, now);
}

/** Snapshots for a project, oldest first. */
export function getHealthHistory(projectId: string): HealthSnapshot[] {
  return readStore()[projectId] ?? [];
}

/**
 * Change between the two most recent weekly snapshots, or null when there is
 * not yet a previous week to compare against.
 */
export function getHealthTrend(history: HealthSnapshot[]): number | null {
  if (history.length < 2) return null;
  return history[history.length - 1].score - history[history.length - 2].score;
}

export function clearHealthHistory(): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(HEALTH_SNAPSHOT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
