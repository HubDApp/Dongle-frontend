/**
 * Email digest HTML and plain-text template.
 *
 * Renders a digest email with:
 *   - Unread notification count
 *   - Top 5 notifications (title, type badge, timestamp, optional project link)
 *   - "View all" link to /settings/notifications
 *   - One-click unsubscribe link
 *
 * Design: single-column, 600px max-width, inlined styles for broad
 * email client compatibility. No external CSS or images.
 */

import type { AppNotification } from "@/types/notification";
import type { DigestFrequency } from "@/types/digest";

export interface DigestTemplateData {
  recipientId: string;
  frequency: DigestFrequency;
  unreadCount: number;
  /** At most 5 notifications */
  topNotifications: AppNotification[];
  appBaseUrl: string;
  unsubscribeToken: string;
  /** ISO string — used to show "as of" timestamp in footer */
  generatedAt: string;
}

// ── Type label map ─────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  project_verified:                  "Project Verified ✓",
  project_rejected:                  "Project Rejected",
  review_approved:                   "Review Approved ✓",
  review_rejected:                   "Review Rejected",
  verification_evidence_requested:   "Evidence Requested",
  submission_comment:                "New Comment",
  submission_mention:                "Mentioned",
  submission_shared:                 "Shared",
  submission_team_change:            "Team Update",
  claim_received:                    "Claim Received",
  claim_approved:                    "Claim Approved ✓",
  claim_rejected:                    "Claim Rejected",
};

const TYPE_COLORS: Record<string, string> = {
  project_verified:  "#0ECB81",
  project_rejected:  "#F6465D",
  review_approved:   "#0ECB81",
  review_rejected:   "#F6465D",
  claim_approved:    "#0ECB81",
  claim_rejected:    "#F6465D",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? "#635BFF";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── HTML template ──────────────────────────────────────────────────────────────
export function renderDigestHtml(data: DigestTemplateData): string {
  const {
    frequency,
    unreadCount,
    topNotifications,
    appBaseUrl,
    unsubscribeToken,
    generatedAt,
  } = data;

  const viewAllUrl = `${appBaseUrl}/settings/notifications`;
  const unsubscribeUrl = `${appBaseUrl}/api/digest/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const frequencyLabel = frequency === "daily" ? "Daily" : "Weekly";
  const subject = `Your ${frequencyLabel} Dongle digest — ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`;

  const notificationRows = topNotifications
    .map(
      (n) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e4e4e7;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:0 0 4px 0;">
              <span style="
                display:inline-block;
                background:${typeColor(n.type)}22;
                color:${typeColor(n.type)};
                font-size:11px;
                font-weight:600;
                padding:2px 8px;
                border-radius:99px;
                text-transform:uppercase;
                letter-spacing:0.04em;
              ">${escapeHtml(typeLabel(n.type))}</span>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:4px 0 2px;font-size:15px;font-weight:600;color:#09090b;">
                ${escapeHtml(n.title || typeLabel(n.type))}
              </p>
              ${
                n.message
                  ? `<p style="margin:0 0 4px;font-size:13px;color:#71717a;">${escapeHtml(n.message)}</p>`
                  : ""
              }
              ${
                n.projectName
                  ? `<p style="margin:0 0 4px;font-size:13px;color:#71717a;">Project: <strong>${escapeHtml(n.projectName)}</strong></p>`
                  : ""
              }
              <p style="margin:0;font-size:12px;color:#a1a1aa;">${formatDate(n.createdAt)}</p>
            </td>
            ${
              n.projectId
                ? `<td style="text-align:right;white-space:nowrap;">
                     <a href="${appBaseUrl}/projects/${encodeURIComponent(n.projectId)}"
                        style="font-size:13px;color:#635BFF;text-decoration:none;font-weight:500;">
                       View →
                     </a>
                   </td>`
                : ""
            }
          </tr>
        </table>
      </td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#09090b;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">
                🔌 Dongle
              </p>
              <p style="margin:0;font-size:13px;color:#a1a1aa;">
                ${escapeHtml(frequencyLabel)} notification digest
              </p>
            </td>
          </tr>

          <!-- Unread count hero -->
          <tr>
            <td style="background:#635BFF;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:48px;font-weight:900;color:#ffffff;line-height:1;">
                ${unreadCount}
              </p>
              <p style="margin:0;font-size:15px;color:#c7c4ff;font-weight:500;">
                unread notification${unreadCount !== 1 ? "s" : ""} since your last digest
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px;">
              ${
                topNotifications.length > 0
                  ? `<h2 style="margin:0 0 8px;font-size:16px;font-weight:700;color:#09090b;">
                       Top notifications
                     </h2>
                     <p style="margin:0 0 16px;font-size:13px;color:#71717a;">
                       Here are your most recent unread notifications.
                     </p>
                     <table width="100%" cellpadding="0" cellspacing="0" border="0">
                       ${notificationRows}
                     </table>`
                  : `<p style="margin:0;text-align:center;font-size:15px;color:#71717a;padding:32px 0;">
                       You have no unread notifications right now.
                     </p>`
              }

              ${
                unreadCount > 5
                  ? `<p style="margin:24px 0 0;font-size:13px;color:#71717a;text-align:center;">
                       … and ${unreadCount - 5} more notification${unreadCount - 5 !== 1 ? "s" : ""}.
                     </p>`
                  : ""
              }

              <!-- CTA -->
              <div style="margin-top:32px;text-align:center;">
                <a href="${viewAllUrl}"
                   style="
                     display:inline-block;
                     background:#635BFF;
                     color:#ffffff;
                     font-size:15px;
                     font-weight:600;
                     padding:14px 32px;
                     border-radius:8px;
                     text-decoration:none;
                     letter-spacing:-0.01em;
                   ">
                  View all notifications →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">
                You're receiving this because you opted into ${frequencyLabel.toLowerCase()} email digests.
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">
                Generated ${formatDate(generatedAt)} · UTC
              </p>
              <p style="margin:0;">
                <a href="${viewAllUrl}"
                   style="font-size:12px;color:#635BFF;text-decoration:none;margin:0 8px;">
                  Manage preferences
                </a>
                ·
                <a href="${unsubscribeUrl}"
                   style="font-size:12px;color:#71717a;text-decoration:none;margin:0 8px;">
                  Unsubscribe
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Plain-text template ────────────────────────────────────────────────────────
export function renderDigestText(data: DigestTemplateData): string {
  const {
    frequency,
    unreadCount,
    topNotifications,
    appBaseUrl,
    unsubscribeToken,
    generatedAt,
  } = data;

  const viewAllUrl = `${appBaseUrl}/settings/notifications`;
  const unsubscribeUrl = `${appBaseUrl}/api/digest/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const frequencyLabel = frequency === "daily" ? "Daily" : "Weekly";

  const lines = [
    `🔌 Dongle — ${frequencyLabel} Digest`,
    "=".repeat(40),
    "",
    `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}.`,
    "",
  ];

  if (topNotifications.length > 0) {
    lines.push("TOP NOTIFICATIONS", "-".repeat(40));
    topNotifications.forEach((n, i) => {
      lines.push(
        `${i + 1}. [${typeLabel(n.type)}] ${n.title || typeLabel(n.type)}`,
      );
      if (n.message) lines.push(`   ${n.message}`);
      if (n.projectName) lines.push(`   Project: ${n.projectName}`);
      lines.push(`   ${formatDate(n.createdAt)}`);
      if (n.projectId) {
        lines.push(`   ${appBaseUrl}/projects/${n.projectId}`);
      }
      lines.push("");
    });
  }

  if (unreadCount > 5) {
    lines.push(`…and ${unreadCount - 5} more notification${unreadCount - 5 !== 1 ? "s" : ""}.`, "");
  }

  lines.push(
    "-".repeat(40),
    `View all: ${viewAllUrl}`,
    "",
    `Generated: ${formatDate(generatedAt)}`,
    "",
    "To change your digest frequency or unsubscribe:",
    `  Preferences: ${viewAllUrl}`,
    `  Unsubscribe:  ${unsubscribeUrl}`,
  );

  return lines.join("\n");
}

// ── Subject line helper ────────────────────────────────────────────────────────
export function renderDigestSubject(
  frequency: DigestFrequency,
  unreadCount: number,
): string {
  const label = frequency === "daily" ? "Daily" : "Weekly";
  if (unreadCount === 0) {
    return `Your ${label} Dongle digest — no new notifications`;
  }
  return `Your ${label} Dongle digest — ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`;
}
