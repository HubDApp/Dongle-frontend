/**
 * Acquisition attribution (Issue #715).
 *
 * Captures UTM parameters, persists first-touch / last-touch attribution for
 * the session, and aggregates per-source acquisition metrics.
 */

import { toCsv } from "@/lib/analytics-dashboard/csv";

const STORAGE_KEY = "dongle:attribution:v1";

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

export interface TouchPoint extends UtmParams {
  landingPage: string;
  timestamp: string;
}

export interface AttributionRecord {
  sessionId: string;
  firstTouch: TouchPoint;
  lastTouch: TouchPoint;
  conversions: number;
  engaged: boolean;
}

export interface AttributionState {
  firstTouch: TouchPoint | null;
  lastTouch: TouchPoint | null;
}

export interface AttributionMetric {
  source: string;
  medium: string;
  campaign: string;
  usersAcquired: number;
  conversions: number;
  conversionRate: number;
  engagementRate: number;
}

const UTM_KEYS: Array<keyof UtmParams> = [
  "source",
  "medium",
  "campaign",
  "term",
  "content",
];

/** Parse UTM parameters from a query string. Returns `null` when none are present. */
export function parseUtm(search: string): UtmParams | null {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const found: Partial<UtmParams> = {};
  let hasAny = false;
  for (const key of UTM_KEYS) {
    const value = params.get(`utm_${key}`);
    if (value) {
      found[key] = value;
      hasAny = true;
    }
  }
  if (!hasAny || !found.source) return null;
  return {
    source: found.source,
    medium: found.medium ?? "(none)",
    campaign: found.campaign ?? "(none)",
    term: found.term,
    content: found.content,
  };
}

export function buildTouchPoint(
  utm: UtmParams,
  landingPage: string,
  now: Date = new Date(),
): TouchPoint {
  return { ...utm, landingPage, timestamp: now.toISOString() };
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function getSessionId(): string {
  if (!hasStorage()) return "ssr";
  try {
    const existing = window.sessionStorage.getItem(`${STORAGE_KEY}:id`);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
        : `a${Date.now().toString(36)}`;
    window.sessionStorage.setItem(`${STORAGE_KEY}:id`, id);
    return id;
  } catch {
    return "unknown";
  }
}

function readRecords(): AttributionRecord[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AttributionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: AttributionRecord[]): void {
  if (!hasStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-500)));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Capture attribution on the current page load.
 *
 * - The first touch of the session is preserved (first-touch attribution).
 * - Every subsequent touch with UTM parameters overwrites the last touch
 *   (last-touch attribution).
 */
export function captureAttribution(
  search: string,
  landingPage: string,
  now: Date = new Date(),
): AttributionState {
  const utm = parseUtm(search);
  const sessionId = getSessionId();
  const records = readRecords();
  const existing = records.find((record) => record.sessionId === sessionId);

  if (!utm) {
    return {
      firstTouch: existing?.firstTouch ?? null,
      lastTouch: existing?.lastTouch ?? null,
    };
  }

  const touch = buildTouchPoint(utm, landingPage, now);
  if (existing) {
    existing.lastTouch = touch;
  } else {
    records.push({
      sessionId,
      firstTouch: touch,
      lastTouch: touch,
      conversions: 0,
      engaged: false,
    });
  }
  writeRecords(records);

  const current = records.find((record) => record.sessionId === sessionId)!;
  return { firstTouch: current.firstTouch, lastTouch: current.lastTouch };
}

/** Attribution for the current session (first and last touch). */
export function getAttribution(): AttributionState {
  const sessionId = getSessionId();
  const record = readRecords().find((r) => r.sessionId === sessionId);
  return {
    firstTouch: record?.firstTouch ?? null,
    lastTouch: record?.lastTouch ?? null,
  };
}

/** Mark the session as engaged (e.g. user interacted meaningfully). */
export function markEngaged(): void {
  updateCurrent((record) => {
    record.engaged = true;
  });
}

/** Record a conversion for the session's last-touch source. */
export function recordConversion(amount = 1): void {
  updateCurrent((record) => {
    record.conversions += amount;
  });
}

function updateCurrent(mutate: (record: AttributionRecord) => void): void {
  const sessionId = getSessionId();
  const records = readRecords();
  const record = records.find((r) => r.sessionId === sessionId);
  if (!record) return;
  mutate(record);
  writeRecords(records);
}

export function getAttributionRecords(): AttributionRecord[] {
  return readRecords();
}

/** Aggregate acquisition metrics per source/medium/campaign. */
export function computeAttributionMetrics(
  records: AttributionRecord[] = readRecords(),
): AttributionMetric[] {
  const groups = new Map<string, AttributionMetric>();

  for (const record of records) {
    const touch = record.lastTouch;
    const key = `${touch.source}|${touch.medium}|${touch.campaign}`;
    const group =
      groups.get(key) ??
      ({
        source: touch.source,
        medium: touch.medium,
        campaign: touch.campaign,
        usersAcquired: 0,
        conversions: 0,
        conversionRate: 0,
        engagementRate: 0,
      } satisfies AttributionMetric);

    group.usersAcquired += 1;
    group.conversions += record.conversions;
    if (record.engaged) group.engagementRate += 1;
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      conversionRate:
        group.usersAcquired > 0 ? group.conversions / group.usersAcquired : 0,
      engagementRate:
        group.usersAcquired > 0 ? group.engagementRate / group.usersAcquired : 0,
    }))
    .sort((a, b) => b.usersAcquired - a.usersAcquired || a.source.localeCompare(b.source));
}

export function toAttributionCsv(metrics: AttributionMetric[]): string {
  return toCsv(
    ["source", "medium", "campaign", "users_acquired", "conversions", "conversion_rate", "engagement_rate"],
    metrics.map((m) => [
      m.source,
      m.medium,
      m.campaign,
      m.usersAcquired,
      m.conversions,
      m.conversionRate.toFixed(4),
      m.engagementRate.toFixed(4),
    ]),
  );
}

/**
 * Deterministic sample attribution records used to preview the dashboard
 * before a campaign has collected real traffic.
 */
export function buildSampleAttributionRecords(now: Date = new Date()): AttributionRecord[] {
  const channels = [
    { source: "twitter", medium: "social", campaign: "launch" },
    { source: "producthunt", medium: "referral", campaign: "launch" },
    { source: "google", medium: "cpc", campaign: "brand_search" },
    { source: "discord", medium: "community", campaign: "always_on" },
    { source: "newsletter", medium: "email", campaign: "weekly_digest" },
  ];
  const records: AttributionRecord[] = [];
  channels.forEach((channel, index) => {
    const users = 18 + index * 11;
    for (let i = 0; i < users; i += 1) {
      const touch: TouchPoint = {
        ...channel,
        landingPage: index % 2 === 0 ? "/discover" : "/",
        timestamp: now.toISOString(),
      };
      records.push({
        sessionId: `sample-${index}-${i}`,
        firstTouch: touch,
        lastTouch: touch,
        conversions: i % 4 === 0 ? 1 : 0,
        engaged: i % 3 !== 0,
      });
    }
  });
  return records;
}
