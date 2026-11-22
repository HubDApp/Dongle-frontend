"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { renderDigestHtml } from "@/lib/email/digest-template";
import type { DigestFrequency } from "@/types/digest";
import type { AppNotification } from "@/types/notification";

const PREVIEW_NOTIFICATIONS: AppNotification[] = [
  {
    id: "preview-1",
    recipientAddress: "preview",
    type: "project_verified",
    title: "Your project was verified",
    message: "Soroban Swap passed verification.",
    createdAt: "2026-01-01T09:00:00.000Z",
    read: false,
    projectId: "preview-project",
    projectName: "Soroban Swap",
  },
  {
    id: "preview-2",
    recipientAddress: "preview",
    type: "review_approved",
    title: "Your review was approved",
    message: "Thanks for the detailed feedback.",
    createdAt: "2026-01-01T09:02:00.000Z",
    read: false,
    projectId: "preview-project",
    projectName: "Soroban Swap",
  },
  {
    id: "preview-3",
    recipientAddress: "preview",
    type: "verification_evidence_requested",
    title: "More evidence requested",
    message: "A reviewer asked for a deployment proof link.",
    createdAt: "2026-01-01T09:04:00.000Z",
    read: false,
    projectId: "preview-project",
    projectName: "Soroban Swap",
  },
  {
    id: "preview-4",
    recipientAddress: "preview",
    type: "claim_approved",
    title: "Ownership claim approved",
    message: "You now manage Soroban Swap.",
    createdAt: "2026-01-01T09:06:00.000Z",
    read: false,
    projectId: "preview-project",
    projectName: "Soroban Swap",
  },
  {
    id: "preview-5",
    recipientAddress: "preview",
    type: "project_update_posted",
    title: "New update from a project you follow",
    message: "Aurora Lend shipped v2 of its dashboard.",
    createdAt: "2026-01-01T09:08:00.000Z",
    read: false,
    projectId: "preview-project",
    projectName: "Aurora Lend",
  },
];

interface DigestPreferencesProps {
  defaultEmail?: string;
}

export function DigestPreferences({ defaultEmail = "" }: DigestPreferencesProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [frequency, setFrequency] = useState<DigestFrequency>("never");
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

    void fetch("/api/digest/preferences", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as {
          preferences?: {
            email: string;
            frequency: DigestFrequency;
            timezone: string;
          } | null;
        };
        if (cancelled || !body.preferences) return;
        setEmail(body.preferences.email);
        setFrequency(body.preferences.frequency);
        setTimezone((current) => body.preferences?.timezone || current);
      })
      .catch(() => {
        // Digest preferences are optional; keep the local defaults.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const previewHtml = useMemo(
    () =>
      renderDigestHtml({
        recipientId: "preview",
        frequency: frequency === "never" ? "weekly" : frequency,
        unreadCount: PREVIEW_NOTIFICATIONS.length,
        topNotifications: PREVIEW_NOTIFICATIONS,
        appBaseUrl:
          typeof window === "undefined" ? "http://localhost:3000" : window.location.origin,
        unsubscribeToken: "preview-token",
        generatedAt: new Date().toISOString(),
      }),
    [frequency],
  );

  const handleSave = async () => {
    const trimmedEmail = email.trim();

    if (
      (frequency !== "never" || trimmedEmail) &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      toast.error("Enter a valid email address");
      return;
    }

    if (frequency !== "never" || trimmedEmail) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch {
        toast.error("Enter a valid IANA timezone");
        return;
      }
    }

    setSaving(true);
    try {
      const response =
        frequency === "never" && !trimmedEmail
          ? await fetch("/api/digest/preferences", {
              method: "DELETE",
              credentials: "include",
            })
          : await fetch("/api/digest/preferences", {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: trimmedEmail,
                frequency,
                timezone,
              }),
            });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        preferences?: {
          email: string;
          frequency: DigestFrequency;
          timezone: string;
        };
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save email digest preferences");
      }

      if (body.preferences) {
        setEmail(body.preferences.email);
        setFrequency(body.preferences.frequency);
        setTimezone(body.preferences.timezone);
      }
      toast.success(
        frequency === "never"
          ? "Email digests disabled"
          : "Email digest preferences saved",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save email digest preferences",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Email digest</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Get a daily or weekly summary of unread notifications, even when you
          are away from the app.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading digest preferences…
        </p>
      ) : (
        <div className="space-y-5">
          <label className="block text-sm font-medium">
            Email address
            <Input
              className="mt-1"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your.email@example.com"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Frequency
              <select
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900/50"
                value={frequency}
                onChange={(event) =>
                  setFrequency(event.target.value as DigestFrequency)
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="never">Never</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Timezone
              <Input
                className="mt-1"
                type="text"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                aria-label="Digest timezone"
                list="digest-timezones"
              />
              <datalist id="digest-timezones">
                {[
                  "UTC",
                  "America/Los_Angeles",
                  "America/Chicago",
                  "America/New_York",
                  "Europe/London",
                  "Europe/Paris",
                  "Asia/Kolkata",
                  "Asia/Tokyo",
                  "Australia/Sydney",
                ].map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </label>
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Digests are sent at 9:00 AM in your timezone. You can unsubscribe
            from the footer of any digest email.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleSave()} isLoading={saving}>
              Save digest preferences
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview((current) => !current)}
            >
              {showPreview ? "Hide preview" : "Preview email"}
            </Button>
          </div>

          {showPreview ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <iframe
                title="Email digest preview"
                srcDoc={previewHtml}
                className="h-[560px] w-full bg-white"
                sandbox=""
              />
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
