"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui";
import { Bell, Mail, Smartphone, Check } from "lucide-react";
import {
  notificationPreferencesService,
  type NotificationPreferences,
} from "@/services/notifications/notification-preferences.service";
import type { NotificationDevice } from "@/lib/notifications/delivery-policy";
import { groupSimilarNotifications } from "@/lib/notifications/delivery-policy";
import { toast } from "sonner";

const BATCH_PREVIEW_EVENTS = [
  { id: "preview-update-1", type: "project_update", recipientId: "preview", createdAt: "2026-01-01T09:00:00.000Z" },
  { id: "preview-update-2", type: "project_update", recipientId: "preview", createdAt: "2026-01-01T09:01:00.000Z" },
  { id: "preview-comment", type: "submission_comment", recipientId: "preview", createdAt: "2026-01-01T09:02:00.000Z" },
];

export interface NotificationPreferencesProps {
  userId: string;
}

export function NotificationPreferencesComponent({
  userId,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(
    null
  );
  const [email, setEmail] = useState("");
  const [timeZoneDraft, setTimeZoneDraft] = useState("UTC");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prefs = notificationPreferencesService.getPreferences(userId);
    setPreferences(prefs);
    setEmail(prefs.email || "");
    setTimeZoneDraft(prefs.quietHours.timeZone);
  }, [userId]);

  const updateQuietHours = (updates: Partial<NotificationPreferences["quietHours"]>) => {
    if (!preferences) return;
    const updated = notificationPreferencesService.updatePreferences(userId, {
      quietHours: { ...preferences.quietHours, ...updates },
    });
    setPreferences(updated);
  };

  const updateBatching = (updates: Partial<NotificationPreferences["batching"]>) => {
    if (!preferences) return;
    const updated = notificationPreferencesService.updatePreferences(userId, {
      batching: { ...preferences.batching, ...updates },
    });
    setPreferences(updated);
  };

  const toggleDeviceSetting = (
    device: NotificationDevice,
    key: keyof NotificationPreferences["devices"]["desktop"],
  ) => {
    if (!preferences) return;
    const updated = notificationPreferencesService.updatePreferences(userId, {
      devices: {
        desktop: { ...preferences.devices.desktop },
        mobile: { ...preferences.devices.mobile },
        [device]: {
          ...preferences.devices[device],
          [key]: !preferences.devices[device][key],
        },
      },
    });
    setPreferences(updated);
  };

  const saveTimeZone = () => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timeZoneDraft });
      updateQuietHours({ timeZone: timeZoneDraft });
    } catch {
      setTimeZoneDraft(preferences?.quietHours.timeZone ?? "UTC");
      toast.error("Enter a valid IANA timezone");
    }
  };

  const handleToggleEnabled = () => {
    if (!preferences) return;

    const updated = notificationPreferencesService.updatePreferences(userId, {
      enabled: !preferences.enabled,
    });
    setPreferences(updated);
    toast.success(
      updated.enabled
        ? "Notifications enabled"
        : "Notifications disabled"
    );
  };

  const handleToggleChannel = (channel: keyof NotificationPreferences["channels"]) => {
    if (!preferences) return;

    const updated = notificationPreferencesService.updatePreferences(userId, {
      channels: {
        ...preferences.channels,
        [channel]: !preferences.channels[channel],
      },
    });
    setPreferences(updated);
    toast.success("Channel preferences updated");
  };

  const handleToggleEvent = (event: keyof NotificationPreferences["events"]) => {
    if (!preferences) return;

    const updated = notificationPreferencesService.updatePreferences(userId, {
      events: {
        ...preferences.events,
        [event]: !preferences.events[event],
      },
    });
    setPreferences(updated);
    toast.success("Event preferences updated");
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const updated = notificationPreferencesService.setEmail(userId, email);
      setPreferences(updated);
      toast.success("Email address saved");
    } catch (error) {
      toast.error("Failed to save email address");
    } finally {
      setSaving(false);
    }
  };

  if (!preferences) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Notifications</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {preferences.enabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
          <Button
            onClick={handleToggleEnabled}
            variant={preferences.enabled ? "default" : "outline"}
          >
            {preferences.enabled ? "Disable All" : "Enable All"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Do not disturb</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Silence all notification toasts on every device. Notifications remain in your inbox.
            </p>
          </div>
          <Checkbox
            aria-label="Do not disturb"
            checked={preferences.doNotDisturb}
            onChange={() => {
              const updated = notificationPreferencesService.updatePreferences(userId, {
                doNotDisturb: !preferences.doNotDisturb,
              });
              setPreferences(updated);
            }}
            disabled={!preferences.enabled}
          />
        </div>
        <div className="grid gap-5 border-t border-zinc-200 pt-5 dark:border-zinc-800 sm:grid-cols-2">
          <div>
            <label className="flex items-center gap-3 font-medium">
              <Checkbox
                checked={preferences.quietHours.enabled}
                onChange={() => updateQuietHours({ enabled: !preferences.quietHours.enabled })}
                disabled={!preferences.enabled || preferences.doNotDisturb}
              />
              Quiet hours
            </label>
            <p className="ml-8 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Non-urgent notifications wait until quiet hours end. Urgent notifications still arrive.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Start
                <Input
                  className="mt-1"
                  type="time"
                  value={preferences.quietHours.startTime}
                  onChange={(event) => updateQuietHours({ startTime: event.target.value })}
                  disabled={!preferences.enabled || !preferences.quietHours.enabled}
                  aria-label="Quiet hours start time"
                />
              </label>
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                End
                <Input
                  className="mt-1"
                  type="time"
                  value={preferences.quietHours.endTime}
                  onChange={(event) => updateQuietHours({ endTime: event.target.value })}
                  disabled={!preferences.enabled || !preferences.quietHours.enabled}
                  aria-label="Quiet hours end time"
                />
              </label>
            </div>
            <label className="mt-3 block text-sm text-zinc-600 dark:text-zinc-400">
              Timezone
              <Input
                className="mt-1"
                type="text"
                value={timeZoneDraft}
                onChange={(event) => setTimeZoneDraft(event.target.value)}
                onBlur={saveTimeZone}
                disabled={!preferences.enabled || !preferences.quietHours.enabled}
                aria-label="Quiet hours timezone"
                list="notification-timezones"
              />
              <datalist id="notification-timezones">
                {["UTC", "America/Los_Angeles", "America/Chicago", "America/New_York", "Europe/London", "Europe/Paris", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"].map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <label className="flex items-center gap-3 font-medium">
              <Checkbox
                checked={preferences.batching.enabled}
                onChange={() => updateBatching({ enabled: !preferences.batching.enabled })}
                disabled={!preferences.enabled || preferences.doNotDisturb}
              />
              Batch low-priority notifications
            </label>
            <p className="ml-8 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Send one daily digest instead of a toast for every update.
            </p>
            <label className="mt-4 block text-sm text-zinc-600 dark:text-zinc-400">
              Digest time
              <Input
                className="mt-1"
                type="time"
                value={preferences.batching.digestTime}
                onChange={(event) => updateBatching({ digestTime: event.target.value })}
                disabled={!preferences.enabled || !preferences.batching.enabled}
                aria-label="Daily digest time"
              />
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm font-medium">
              <Checkbox
                checked={preferences.batching.smartGrouping}
                onChange={() => updateBatching({ smartGrouping: !preferences.batching.smartGrouping })}
                disabled={!preferences.enabled || !preferences.batching.enabled}
              />
              Group similar notifications
            </label>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <h4 className="font-semibold">Device delivery</h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {(["desktop", "mobile"] as const).map((device) => (
              <fieldset key={device} className="space-y-3">
                <legend className="mb-2 text-sm font-medium capitalize">{device}</legend>
                {([
                  ["enabled", "Show notification toasts"],
                  ["quietHours", "Apply quiet hours"],
                  ["batchLowPriority", "Batch low-priority items"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <Checkbox
                      checked={preferences.devices[device][key]}
                      onChange={() => toggleDeviceSetting(device, key)}
                      disabled={!preferences.enabled || preferences.doNotDisturb}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800" aria-live="polite">
          <h4 className="font-semibold">Digest preview</h4>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {preferences.batching.enabled
              ? `At ${preferences.batching.digestTime} (${preferences.quietHours.timeZone}), similar activity is grouped like this:`
              : "Turn on batching to preview your daily digest."}
          </p>
          {preferences.batching.enabled && (
            <div className="mt-3 flex flex-wrap gap-2">
              {groupSimilarNotifications(BATCH_PREVIEW_EVENTS, preferences.batching.smartGrouping).map((group, index) => (
                <span key={`${group.type}-${index}`} className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700">
                  {group.count} {group.type.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Urgent mentions, verification requests, and project rejections bypass quiet hours.
          </p>
        </div>
      </Card>

      {/* Email Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Email Address</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          We'll send notifications to this email address
        </p>
        <div className="flex gap-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="flex-1"
            disabled={!preferences.enabled}
          />
          <Button
            onClick={handleSaveEmail}
            disabled={saving || !preferences.enabled}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>

      {/* Notification Channels */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Channels</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Choose how you want to receive notifications
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-4 cursor-pointer">
            <Checkbox
              checked={preferences.channels.email}
              onChange={() => handleToggleChannel("email")}
              disabled={!preferences.enabled || !preferences.email}
            />
            <div className="flex items-center gap-3 flex-1">
              <Mail className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Receive notifications via email
                </p>
              </div>
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer">
            <Checkbox
              checked={preferences.channels.inApp}
              onChange={() => handleToggleChannel("inApp")}
              disabled={!preferences.enabled}
            />
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="font-medium">In-App</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Show notifications in the app
                </p>
              </div>
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer">
            <Checkbox
              checked={preferences.channels.push}
              onChange={() => handleToggleChannel("push")}
              disabled={!preferences.enabled}
            />
            <div className="flex items-center gap-3 flex-1">
              <Smartphone className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Receive push notifications (coming soon)
                </p>
              </div>
            </div>
          </label>
        </div>
      </Card>

      {/* Event Preferences */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Event Notifications</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Choose which events you want to be notified about
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-4 cursor-pointer">
            <Checkbox
              checked={preferences.events.projectUpdates}
              onChange={() => handleToggleEvent("projectUpdates")}
              disabled={!preferences.enabled}
            />
            <div className="flex-1">
              <p className="font-medium">Project Updates</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Notifications about projects you follow
              </p>
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer">
            <Checkbox
              checked={preferences.events.reviewComments}
              onChange={() => handleToggleEvent("reviewComments")}
              disabled={!preferences.enabled}
            />
            <div className="flex-1">
              <p className="font-medium">Review Comments</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                When someone comments on your review
              </p>
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer">
            <Checkbox
              checked={preferences.events.reviewMentions}
              onChange={() => handleToggleEvent("reviewMentions")}
              disabled={!preferences.enabled}
            />
            <div className="flex-1">
              <p className="font-medium">Mentions</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                When someone mentions you in a review
              </p>
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer">
            <Checkbox
              checked={preferences.events.verificationStatus}
              onChange={() => handleToggleEvent("verificationStatus")}
              disabled={!preferences.enabled}
            />
            <div className="flex-1">
              <p className="font-medium">Verification Status</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Updates about your verification requests
              </p>
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer">
            <Checkbox
              checked={preferences.events.newFollowers}
              onChange={() => handleToggleEvent("newFollowers")}
              disabled={!preferences.enabled}
            />
            <div className="flex-1">
              <p className="font-medium">New Followers</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                When someone follows your projects
              </p>
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer">
            <Checkbox
              checked={preferences.events.weeklyDigest}
              onChange={() => handleToggleEvent("weeklyDigest")}
              disabled={!preferences.enabled}
            />
            <div className="flex-1">
              <p className="font-medium">Weekly Digest</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Summary of activity and trending projects
              </p>
            </div>
          </label>
        </div>
      </Card>

      {/* Save Confirmation */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Check className="w-4 h-4" />
        <span>Changes are saved automatically</span>
      </div>
    </div>
  );
}
