/**
 * Form Submission Notification Service
 *
 * Handles notifications for new form submissions (project registrations, reviews, etc.)
 * supporting:
 * - Email notifications
 * - In-app notifications
 * - Slack integration
 * - Notification preferences
 * - Throttle duplicate notifications
 */

import { emitNotificationEvent } from "@/lib/notifications/emit";

export interface FormNotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  slackEnabled: boolean;
  recipientEmail?: string;
  slackWebhookUrl?: string;
  enabledTypes: string[];
  throttleWindowMs: number;
}

export interface FormSubmissionPayload {
  submissionId: string;
  type: "project_submitted" | "review_submitted" | "form_submission";
  recipientAddress: string;
  projectName: string;
  projectId?: string;
  submitter?: string;
  details?: Record<string, unknown>;
  createdAt?: string;
}

export interface SentEmailRecord {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
}

export interface SentSlackRecord {
  id: string;
  webhookUrl: string;
  text: string;
  createdAt: string;
}

const PREFERENCES_STORAGE_KEY = "dongle_form_notification_preferences";
const THROTTLE_STORAGE_KEY = "dongle_form_notification_throttle";

const DEFAULT_PREFERENCES: FormNotificationPreferences = {
  emailEnabled: true,
  inAppEnabled: true,
  slackEnabled: false,
  recipientEmail: "admin@dongle.app",
  slackWebhookUrl: "",
  enabledTypes: ["project_submitted", "review_submitted", "form_submission"],
  throttleWindowMs: 60 * 1000, // 60 seconds
};

// In-memory test inspection stores
let sentEmailsStore: SentEmailRecord[] = [];
let sentSlackStore: SentSlackRecord[] = [];

export const formSubmissionNotificationService = {
  getPreferences(): FormNotificationPreferences {
    if (typeof window === "undefined") return DEFAULT_PREFERENCES;
    try {
      const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (!raw) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  updatePreferences(prefs: Partial<FormNotificationPreferences>): FormNotificationPreferences {
    const current = this.getPreferences();
    const next = { ...current, ...prefs };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    return next;
  },

  isThrottled(submissionKey: string, throttleWindowMs?: number): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(THROTTLE_STORAGE_KEY);
      const throttleMap: Record<string, number> = raw ? JSON.parse(raw) : {};
      const lastTime = throttleMap[submissionKey];
      if (!lastTime) return false;

      const windowMs = throttleWindowMs ?? this.getPreferences().throttleWindowMs;
      const now = Date.now();
      return now - lastTime < windowMs;
    } catch {
      return false;
    }
  },

  recordThrottle(submissionKey: string): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(THROTTLE_STORAGE_KEY);
      const throttleMap: Record<string, number> = raw ? JSON.parse(raw) : {};
      throttleMap[submissionKey] = Date.now();
      
      // Cleanup old entries older than 1 hour
      const cutoff = Date.now() - 3600 * 1000;
      for (const k of Object.keys(throttleMap)) {
        if (throttleMap[k] < cutoff) {
          delete throttleMap[k];
        }
      }

      localStorage.setItem(THROTTLE_STORAGE_KEY, JSON.stringify(throttleMap));
    } catch {
      // ignore
    }
  },

  async sendEmailNotification(to: string, subject: string, body: string, submissionId: string): Promise<SentEmailRecord> {
    const record: SentEmailRecord = {
      id: crypto.randomUUID(),
      to,
      subject,
      body,
      createdAt: new Date().toISOString(),
    };
    sentEmailsStore.push(record);

    // Also attempt server dispatch if API route exists
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/notifications/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, body, submissionId }),
        }).catch(() => {});
      } catch {
        // ignore network error for mock/offline
      }
    }

    return record;
  },

  async sendSlackNotification(webhookUrl: string, text: string, submissionId: string): Promise<SentSlackRecord> {
    const record: SentSlackRecord = {
      id: crypto.randomUUID(),
      webhookUrl,
      text,
      createdAt: new Date().toISOString(),
    };
    sentSlackStore.push(record);

    if (webhookUrl && typeof window !== "undefined") {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }).catch(() => {});
      } catch {
        // ignore network error
      }
    }

    return record;
  },

  async notify(payload: FormSubmissionPayload): Promise<{
    inAppSent: boolean;
    emailSent: boolean;
    slackSent: boolean;
    throttled: boolean;
  }> {
    const prefs = this.getPreferences();

    if (!prefs.enabledTypes.includes(payload.type)) {
      return { inAppSent: false, emailSent: false, slackSent: false, throttled: false };
    }

    // Throttle check by submissionId or project identifier
    const throttleKey = `${payload.type}:${payload.submissionId || payload.projectName}`;
    if (this.isThrottled(throttleKey, prefs.throttleWindowMs)) {
      return { inAppSent: false, emailSent: false, slackSent: false, throttled: true };
    }

    this.recordThrottle(throttleKey);

    let inAppSent = false;
    let emailSent = false;
    let slackSent = false;

    // 1. In-app notifications
    if (prefs.inAppEnabled) {
      try {
        await emitNotificationEvent({
          id: payload.submissionId || crypto.randomUUID(),
          type: payload.type,
          recipientId: payload.recipientAddress,
          projectId: payload.projectId,
          projectName: payload.projectName,
          createdAt: payload.createdAt || new Date().toISOString(),
          messageParams: {
            submitter: payload.submitter ?? "User",
            ...((payload.details as Record<string, string>) || {}),
          },
        });
        inAppSent = true;
      } catch (err) {
        console.error("[form-notification] In-app notification failed", err);
      }
    }

    // 2. Email notifications
    if (prefs.emailEnabled && prefs.recipientEmail) {
      try {
        const subject = `New Form Submission: ${payload.projectName} (${payload.type})`;
        const body = `A new form submission was received.\n\nType: ${payload.type}\nProject: ${payload.projectName}\nSubmitter: ${payload.submitter ?? "Unknown"}\nDate: ${payload.createdAt ?? new Date().toISOString()}`;
        await this.sendEmailNotification(prefs.recipientEmail, subject, body, payload.submissionId);
        emailSent = true;
      } catch (err) {
        console.error("[form-notification] Email notification failed", err);
      }
    }

    // 3. Slack integration
    if (prefs.slackEnabled && prefs.slackWebhookUrl) {
      try {
        const slackText = `🚨 *New Form Submission*\n*Type:* ${payload.type}\n*Project:* ${payload.projectName}\n*Submitter:* ${payload.submitter ?? "Unknown"}`;
        await this.sendSlackNotification(prefs.slackWebhookUrl, slackText, payload.submissionId);
        slackSent = true;
      } catch (err) {
        console.error("[form-notification] Slack notification failed", err);
      }
    }

    return { inAppSent, emailSent, slackSent, throttled: false };
  },

  _getSentEmailsForTesting(): SentEmailRecord[] {
    return sentEmailsStore;
  },

  _getSentSlackForTesting(): SentSlackRecord[] {
    return sentSlackStore;
  },

  _clearForTesting(): void {
    sentEmailsStore = [];
    sentSlackStore = [];
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(PREFERENCES_STORAGE_KEY);
        localStorage.removeItem(THROTTLE_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  },
};
