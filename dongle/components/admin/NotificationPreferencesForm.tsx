"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  TRIGGER_LABELS,
  TRIGGER_DESCRIPTIONS,
  type NotificationTriggerKey,
  type NotificationPreferences,
  notificationPreferencesService,
  isQuietNow,
} from "@/services/admin/notification-preferences.service";

const TRIGGER_KEYS = Object.keys(TRIGGER_LABELS) as NotificationTriggerKey[];

interface NotificationPreferencesFormProps {
  initial: NotificationPreferences;
}

export default function NotificationPreferencesForm({ initial }: NotificationPreferencesFormProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const save = (next: NotificationPreferences) => {
    setIsSaving(true);
    const saved = notificationPreferencesService.save(next);
    setPrefs(saved);
    setIsSaving(false);
    toast.success("Notification preferences saved");
  };

  const toggleTrigger = (key: NotificationTriggerKey) => {
    save({ ...prefs, triggers: { ...prefs.triggers, [key]: !prefs.triggers[key] } });
  };

  const toggleChannel = (key: "sse" | "email" | "slackWebhook") => {
    save({ ...prefs, channels: { ...prefs.channels, [key]: !prefs.channels[key] } });
  };

  const handleTest = () => {
    setIsTesting(true);
    const result = notificationPreferencesService.sendTest("system_errors");
    setIsTesting(false);
    if (result.delivered) {
      toast.success("Test notification sent", { description: result.reason });
    } else {
      toast.warning("Test notification not delivered", { description: result.reason });
    }
  };

  return (
    <div className="space-y-6">
      <section aria-label="Notification triggers" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
        <h2 className="text-lg font-bold mb-1">Alert triggers</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Choose which events notify admins.</p>
        <div className="space-y-3">
          {TRIGGER_KEYS.map((key) => (
            <label key={key} className="flex items-start justify-between gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
              <span>
                <span className="block font-medium text-sm">{TRIGGER_LABELS[key]}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">{TRIGGER_DESCRIPTIONS[key]}</span>
              </span>
              <button
                role="switch"
                aria-checked={prefs.triggers[key]}
                aria-label={TRIGGER_LABELS[key]}
                onClick={() => toggleTrigger(key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${prefs.triggers[key] ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${prefs.triggers[key] ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </label>
          ))}
        </div>
      </section>

      <section aria-label="Notification channels" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
        <h2 className="text-lg font-bold mb-1">Channels</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">SSE is live. Email and Slack webhooks are forward-compatible.</p>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">SSE (in-app live updates)</span>
            <input type="checkbox" checked={prefs.channels.sse} onChange={() => toggleChannel("sse")} className="w-5 h-5 accent-zinc-950 dark:accent-white" />
          </label>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Email (future)</span>
              <input type="checkbox" checked={prefs.channels.email} onChange={() => toggleChannel("email")} className="w-5 h-5 accent-zinc-950 dark:accent-white" />
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={prefs.channels.emailAddress}
              onChange={(e) => setPrefs({ ...prefs, channels: { ...prefs.channels, emailAddress: e.target.value } })}
              onBlur={() => save(prefs)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Slack webhook (future)</span>
              <input type="checkbox" checked={prefs.channels.slackWebhook} onChange={() => toggleChannel("slackWebhook")} className="w-5 h-5 accent-zinc-950 dark:accent-white" />
            </label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/…"
              value={prefs.channels.slackWebhookUrl}
              onChange={(e) => setPrefs({ ...prefs, channels: { ...prefs.channels, slackWebhookUrl: e.target.value } })}
              onBlur={() => save(prefs)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
            />
          </div>
        </div>
      </section>

      <section aria-label="Quiet hours" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
        <h2 className="text-lg font-bold mb-1">Quiet hours</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          No notifications during this window. {isQuietNow(prefs.quietHours) ? "Currently quiet." : "Currently active."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.quietHours.enabled}
              onChange={(e) => save({ ...prefs, quietHours: { ...prefs.quietHours, enabled: e.target.checked } })}
              className="w-5 h-5 accent-zinc-950 dark:accent-white"
            />
            Enable quiet hours
          </label>
          <input
            type="time"
            aria-label="Quiet hours start"
            value={prefs.quietHours.start}
            onChange={(e) => save({ ...prefs, quietHours: { ...prefs.quietHours, start: e.target.value } })}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
          />
          <span className="text-sm text-zinc-500">to</span>
          <input
            type="time"
            aria-label="Quiet hours end"
            value={prefs.quietHours.end}
            onChange={(e) => save({ ...prefs, quietHours: { ...prefs.quietHours, end: e.target.value } })}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
          />
        </div>
      </section>

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={isTesting}
          className="px-5 py-2.5 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl text-sm font-bold disabled:opacity-50"
        >
          {isTesting ? "Sending…" : "Send test notification"}
        </button>
        <button
          onClick={() => setPrefs(notificationPreferencesService.reset())}
          disabled={isSaving}
          className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold"
        >
          Reset defaults
        </button>
      </div>
    </div>
  );
}
