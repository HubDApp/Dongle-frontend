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
    const { to, subject, body: emailBody, submissionId } = body as {
      to: string;
      subject: string;
      body: string;
      submissionId: string;
    };

    if (!to || !subject || !emailBody || !submissionId) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body, submissionId" },
        { status: 400 }
      );
    }

    // In production, integrate with email service (SendGrid, Resend, etc.)
    // For now, log the email
    console.log("[Email Notification] Sending email:", {
      to,
      subject,
      body: emailBody,
      submissionId,
      timestamp: new Date().toISOString(),
    });

    // Simulate successful email sending
    return NextResponse.json({
      ok: true,
      message: "Email queued for delivery",
      submissionId,
    });
  } catch (error) {
    console.error("[Email Notification] Failed:", error);
    return NextResponse.json(
      { error: "Failed to send email notification" },
      { status: 500 }
    );
  }
}