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
import { toast } from "sonner";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prefs = notificationPreferencesService.getPreferences(userId);
    setPreferences(prefs);
    setEmail(prefs.email || "");
  }, [userId]);

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
