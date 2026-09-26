import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { webhookUrl, text, submissionId } = body as {
      webhookUrl: string;
      text: string;
      submissionId: string;
    };

    if (!webhookUrl || !text || !submissionId) {
      return NextResponse.json(
        { error: "Missing required fields: webhookUrl, text, submissionId" },
        { status: 400 }
      );
    }

    // Validate webhook URL format (basic check for Slack webhooks)
    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        { error: "Invalid Slack webhook URL" },
        { status: 400 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Slack Notification] Webhook failed:", response.status, errorText);
      return NextResponse.json(
        { error: "Slack webhook request failed", status: response.status },
        { status: 502 }
      );
    }

    console.log("[Slack Notification] Message sent:", {
      submissionId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: "Slack notification sent",
      submissionId,
    });
  } catch (error) {
    console.error("[Slack Notification] Failed:", error);
    return NextResponse.json(
      { error: "Failed to send Slack notification" },
      { status: 500 }
    );
  }
}