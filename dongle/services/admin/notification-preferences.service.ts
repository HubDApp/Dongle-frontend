/**
 * Notification Preferences Service (#700)
 *
 * Stores admin alert-trigger toggles, channels (SSE / email / Slack webhook),
 * quiet-hours windows, and fires test notifications. Persisted in
 * localStorage with the same SSR-safe pattern as audit-log.service.ts.
 */

export type NotificationTriggerKey =
  | "new_verification_requests"
  | "flagged_reviews"
  | "system_errors"
  | "high_value_transactions"
  | "failed_admin_logins";

export type NotificationChannelKey = "sse" | "email" | "slack_webhook";

export interface NotificationTriggers extends Record<NotificationTriggerKey, boolean> {}

export interface NotificationChannels {
  sse: boolean;
  email: boolean;
  slackWebhook: boolean;
  slackWebhookUrl: string;
  emailAddress: string;
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
}

export interface NotificationPreferences {
  triggers: NotificationTriggers;
  channels: NotificationChannels;
  quietHours: QuietHours;
  updatedAt: string;
}

export const TRIGGER_LABELS: Record<NotificationTriggerKey, string> = {
  new_verification_requests: "New verification requests",
  flagged_reviews: "Flagged reviews",
  system_errors: "System errors",
  high_value_transactions: "High-value transactions",
  failed_admin_logins: "Failed admin login attempts",
};

export const TRIGGER_DESCRIPTIONS: Record<NotificationTriggerKey, string> = {
  new_verification_requests: "Notify when a project submits a verification request.",
  flagged_reviews: "Notify when reviews are flagged by users or automation.",
  system_errors: "Notify on indexer, RPC, or background-job failures.",
  high_value_transactions: "Notify on transactions above the review threshold.",
  failed_admin_logins: "Notify when an admin wallet fails to authenticate.",
};

const STORAGE_KEY = "dongle_admin_notification_prefs";

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  triggers: {
    new_verification_requests: true,
    flagged_reviews: true,
    system_errors: true,
    high_value_transactions: false,
    failed_admin_logins: true,
  },
  channels: {
    sse: true,
    email: false,
    slackWebhook: false,
    slackWebhookUrl: "",
    emailAddress: "",
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
  updatedAt: new Date(0).toISOString(),
};

function load(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      triggers: { ...DEFAULT_PREFERENCES.triggers, ...parsed.triggers },
      channels: { ...DEFAULT_PREFERENCES.channels, ...parsed.channels },
      quietHours: { ...DEFAULT_PREFERENCES.quietHours, ...parsed.quietHours },
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : DEFAULT_PREFERENCES.updatedAt,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function save(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // quota / private mode — fail silently
  }
}

/** True when `now` falls inside the quiet-hours window (supports overnight ranges). */
export function isQuietNow(quiet: QuietHours, now: Date = new Date()): boolean {
  if (!quiet.enabled) return false;
  const toMinutes = (t: string): number | null => {
    const m = /^(\d{2}):(\d{2})$/.exec(t);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  };
  const start = toMinutes(quiet.start);
  const end = toMinutes(quiet.end);
  if (start === null || end === null) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  if (start <= end) return current >= start && current < end;
  return current >= start || current < end;
}

export const notificationPreferencesService = {
  get(): NotificationPreferences {
    return load();
  },

  save(prefs: NotificationPreferences): NotificationPreferences {
    const next: NotificationPreferences = { ...prefs, updatedAt: new Date().toISOString() };
    save(next);
    return next;
  },

  reset(): NotificationPreferences {
    const next: NotificationPreferences = {
      ...DEFAULT_PREFERENCES,
      updatedAt: new Date().toISOString(),
    };
    save(next);
    return next;
  },

  /** Record a test notification; returns whether it was suppressed by quiet hours. */
  sendTest(trigger: NotificationTriggerKey = "system_errors"): { delivered: boolean; reason: string } {
    const prefs = load();
    if (isQuietNow(prefs.quietHours)) {
      return { delivered: false, reason: "Suppressed by quiet hours." };
    }
    if (!prefs.triggers[trigger]) {
      return { delivered: false, reason: `Trigger "${TRIGGER_LABELS[trigger]}" is disabled.` };
    }
    const active = (Object.keys(prefs.channels) as NotificationChannelKey[])
      .filter((c) => c === "sse" || c === "email" || c === "slack_webhook")
      .filter((c) => prefs.channels[c]);
    if (active.length === 0) {
      return { delivered: false, reason: "No notification channel is enabled." };
    }
    if (prefs.channels.slackWebhook && !prefs.channels.slackWebhookUrl.trim()) {
      return { delivered: false, reason: "Slack webhook URL is missing." };
    }
    try {
      const log = JSON.parse(localStorage.getItem("dongle_admin_notification_test_log") ?? "[]") as unknown[];
      localStorage.setItem(
        "dongle_admin_notification_test_log",
        JSON.stringify([{ trigger, at: new Date().toISOString(), channels: active }, ...log].slice(0, 20)),
      );
    } catch {
      // ignore persistence failures for test pings
    }
    return { delivered: true, reason: `Test sent via ${active.join(", ")}.` };
  },
};
