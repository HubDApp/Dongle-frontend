import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const PREFERENCES_STORAGE_PREFIX = "dongle_notification_prefs_";

function getStorageKey(recipientId: string): string {
  return `${PREFERENCES_STORAGE_PREFIX}${recipientId}`;
}

const DEFAULT_PREFERENCES = {
  emailEnabled: true,
  inAppEnabled: true,
  slackEnabled: false,
  recipientEmail: "",
  slackWebhookUrl: "",
  enabledTypes: ["project_submitted", "review_submitted", "form_submission"],
  throttleWindowMs: 60 * 1000,
};

export async function GET() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In a real app, this would come from a database
  // For now, we'll return defaults since this is client-side stored
  return NextResponse.json({
    preferences: DEFAULT_PREFERENCES,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  
  // Validate preferences
  const allowedKeys = [
    "emailEnabled",
    "inAppEnabled",
    "slackEnabled",
    "recipientEmail",
    "slackWebhookUrl",
    "enabledTypes",
    "throttleWindowMs",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  // Validate email if provided
  if (updates.recipientEmail && typeof updates.recipientEmail === "string") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.recipientEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
  }

  // Validate slack webhook URL if provided
  if (updates.slackWebhookUrl && typeof updates.slackWebhookUrl === "string") {
    if (!updates.slackWebhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        { error: "Invalid Slack webhook URL format" },
        { status: 400 }
      );
    }
  }

  // Validate throttle window
  if (updates.throttleWindowMs && typeof updates.throttleWindowMs === "number") {
    if (updates.throttleWindowMs < 1000 || updates.throttleWindowMs > 3600000) {
      return NextResponse.json(
        { error: "Throttle window must be between 1 second and 1 hour" },
        { status: 400 }
      );
    }
  }

  // Validate enabled types
  if (updates.enabledTypes && Array.isArray(updates.enabledTypes)) {
    const validTypes = ["project_submitted", "review_submitted", "form_submission"];
    const invalidTypes = updates.enabledTypes.filter((t: string) => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        { error: `Invalid notification types: ${invalidTypes.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // In a real app, this would be saved to a database
  // For now, we return the merged preferences
  const merged = { ...DEFAULT_PREFERENCES, ...updates };

  return NextResponse.json({
    preferences: merged,
    message: "Preferences updated successfully",
  });
}