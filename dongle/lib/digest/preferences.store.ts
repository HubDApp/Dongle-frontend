/**
 * Server-side digest preference store.
 *
 * Backed by an in-memory Map for MVP (same pattern as the notification store).
 * For multi-instance production, replace with a database table or Redis hash.
 *
 * Key: recipientId (wallet address or OAuth subject)
 * Value: DigestPreferences
 */

import { randomUUID } from "node:crypto";
import type { DigestFrequency, DigestPreferences, DigestPreferencesInput } from "@/types/digest";

// ── In-memory store ────────────────────────────────────────────────────────────
const store = new Map<string, DigestPreferences>();

// ── Helpers ────────────────────────────────────────────────────────────────────
function now(): string {
  return new Date().toISOString();
}

function generateToken(): string {
  return randomUUID().replace(/-/g, "");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidFrequency(value: unknown): value is DigestFrequency {
  return value === "daily" || value === "weekly" || value === "never";
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getDigestPreferences(recipientId: string): DigestPreferences | null {
  return store.get(recipientId) ?? null;
}

export function upsertDigestPreferences(
  recipientId: string,
  input: DigestPreferencesInput,
): { prefs: DigestPreferences; error?: never } | { prefs?: never; error: string } {
  if (!isValidEmail(input.email)) {
    return { error: "Invalid email address" };
  }
  if (!isValidFrequency(input.frequency)) {
    return { error: "Frequency must be 'daily', 'weekly', or 'never'" };
  }

  const existing = store.get(recipientId);
  const ts = now();

  const prefs: DigestPreferences = {
    recipientId,
    email: input.email.trim().toLowerCase(),
    frequency: input.frequency,
    timezone: input.timezone ?? existing?.timezone ?? "UTC",
    lastSentAt: existing?.lastSentAt ?? null,
    unsubscribeToken: existing?.unsubscribeToken ?? generateToken(),
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  };

  store.set(recipientId, prefs);
  return { prefs };
}

export function updateLastSentAt(recipientId: string, timestamp: string): void {
  const prefs = store.get(recipientId);
  if (prefs) {
    store.set(recipientId, { ...prefs, lastSentAt: timestamp, updatedAt: now() });
  }
}

/** Unsubscribe by token — safe for one-click mailto: links */
export function unsubscribeByToken(
  token: string,
): { recipientId: string } | null {
  for (const [recipientId, prefs] of store.entries()) {
    if (prefs.unsubscribeToken === token) {
      store.set(recipientId, {
        ...prefs,
        frequency: "never",
        // Rotate the token so the link can only be used once
        unsubscribeToken: generateToken(),
        updatedAt: now(),
      });
      return { recipientId };
    }
  }
  return null;
}

export function deleteDigestPreferences(recipientId: string): boolean {
  return store.delete(recipientId);
}

/**
 * Returns all subscribers who should receive a digest at the current moment,
 * based on their frequency preference and timezone-adjusted 9 AM window.
 *
 * A digest is "due" when:
 *   - frequency === "daily"  AND the current local hour is 9 AND the last send
 *     was not today.
 *   - frequency === "weekly" AND the current local hour is 9 AND the current
 *     local weekday is Monday (ISO 1) AND the last send was not this week.
 */
export function getDueSubscribers(referenceMs?: number): DigestPreferences[] {
  const ref = referenceMs ?? Date.now();
  const due: DigestPreferences[] = [];

  for (const prefs of store.values()) {
    if (prefs.frequency === "never" || !prefs.email) continue;

    const tz = isIANATimezone(prefs.timezone) ? prefs.timezone : "UTC";

    // Local time in the subscriber's timezone
    const localDate = new Date(ref).toLocaleString("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      weekday: "short",
    });

    // Parse the locale string — format: "Mon, 10/18/2026, 09:..."
    const hourMatch = localDate.match(/(\d{2}):/);
    const weekdayMatch = localDate.match(/^(\w+),/);
    const localHour = hourMatch ? parseInt(hourMatch[1], 10) : -1;
    const isMonday = weekdayMatch ? weekdayMatch[1] === "Mon" : false;

    // Only run during the 9 AM hour window
    if (localHour !== 9) continue;

    // Build a local "today" key: YYYY-MM-DD
    const dateMatch = localDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const localDateKey = dateMatch
      ? `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`
      : new Date(ref).toISOString().slice(0, 10);

    if (prefs.frequency === "daily") {
      // Skip if we already sent today
      const lastSentDay = prefs.lastSentAt
        ? new Date(prefs.lastSentAt)
            .toLocaleDateString("sv-SE", { timeZone: tz })
        : null;
      if (lastSentDay !== localDateKey) {
        due.push(prefs);
      }
    } else if (prefs.frequency === "weekly" && isMonday) {
      // Skip if we already sent this week (within the last 6 days)
      if (!prefs.lastSentAt) {
        due.push(prefs);
      } else {
        const msSinceLast = ref - new Date(prefs.lastSentAt).getTime();
        const daysSinceLast = msSinceLast / (1000 * 60 * 60 * 24);
        if (daysSinceLast >= 6) {
          due.push(prefs);
        }
      }
    }
  }

  return due;
}

export function allSubscriberCount(): number {
  return store.size;
}

/** Test helper */
export function resetDigestPreferencesForTests(): void {
  store.clear();
}

// ── Timezone validation ────────────────────────────────────────────────────────
function isIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
