/**
 * GET /api/digest/unsubscribe?token=<unsubscribeToken>
 *
 * One-click unsubscribe from digest emails.
 * Safe to embed in email HTML as a plain link — no auth required.
 * The token is rotated after use so the link can only be used once.
 */

import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/digest/preferences.store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(unsubscribePage("Missing token", false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const result = unsubscribeByToken(token);

  if (!result) {
    return new NextResponse(
      unsubscribePage(
        "This unsubscribe link has already been used or is invalid.",
        false,
      ),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  return new NextResponse(
    unsubscribePage("You have been unsubscribed from Dongle email digests.", true),
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

function unsubscribePage(message: string, success: boolean): string {
  const appUrl =
    (process.env.AUTH_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
  const color = success ? "#0ECB81" : "#F6465D";
  const icon = success ? "✓" : "✗";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Unsubscribe — Dongle</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:80px auto;background:#fff;border-radius:12px;padding:48px 40px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <div style="font-size:48px;line-height:1;margin-bottom:16px;color:${color};">${icon}</div>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#09090b;">
      ${success ? "Unsubscribed" : "Link expired"}
    </h1>
    <p style="margin:0 0 32px;font-size:15px;color:#71717a;line-height:1.6;">
      ${message}
    </p>
    ${
      success
        ? `<p style="margin:0 0 32px;font-size:13px;color:#a1a1aa;">
             You can update your email preferences at any time in your account settings.
           </p>`
        : ""
    }
    <a href="${appUrl}/settings/notifications"
       style="display:inline-block;background:#635BFF;color:#fff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
      Manage preferences
    </a>
  </div>
</body>
</html>`;
}
