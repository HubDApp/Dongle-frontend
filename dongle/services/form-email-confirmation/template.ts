/**
 * Accessible, professional HTML + plain-text email templates
 * for form submission confirmations.
 */

import type { FormEmailConfirmationConfig, FormEmailConfirmationRequest, FormEmailMessage } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatSubmittedAt(iso?: string): string {
  if (!iso) return new Date().toUTCString();
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toUTCString();
}

export function renderConfirmationEmail(
  request: FormEmailConfirmationRequest,
  config: FormEmailConfirmationConfig,
): FormEmailMessage {
  const title = request.subjectName
    ? `Submission received: ${request.subjectName}`
    : `Submission received: ${request.formTitle}`;

  const confirmationUrl = request.confirmationUrl;
  const summaryRows = request.summary
    .map(
      (item) =>
        `<tr>
          <th scope="row" style="text-align:left;padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;font-weight:600;width:36%;">${escapeHtml(item.label)}</th>
          <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;">${escapeHtml(item.value)}</td>
        </tr>`,
    )
    .join("");

  const textSummary = request.summary
    .map((item) => `- ${item.label}: ${item.value}`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(request.locale || "en")}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <div role="article" aria-label="${escapeHtml(title)}" style="max-width:640px;margin:24px auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
    <header style="padding:24px 28px;background:#18181b;color:#fafafa;">
      <p style="margin:0;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.8;">${escapeHtml(config.fromName)}</p>
      <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">We received your submission</h1>
    </header>
    <main style="padding:28px;">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
        Thanks for submitting <strong>${escapeHtml(request.formTitle)}</strong>${
          request.subjectName ? ` for <strong>${escapeHtml(request.subjectName)}</strong>` : ""
        }.
      </p>
      <p style="margin:0 0 20px;font-size:14px;color:#52525b;">
        Submitted at ${escapeHtml(formatSubmittedAt(request.submittedAt))} · Reference
        <code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;">${escapeHtml(request.submissionId)}</code>
      </p>
      <h2 style="margin:0 0 12px;font-size:16px;">Submission summary</h2>
      <table role="table" aria-label="Submission summary" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
        <tbody>
          ${summaryRows || `<tr><td style="padding:8px 12px;color:#71717a;">No fields provided.</td></tr>`}
        </tbody>
      </table>
      ${
        confirmationUrl
          ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.5;">
              Review or confirm your submission using the accessible link below.
            </p>
            <p style="margin:0;">
              <a href="${escapeHtml(confirmationUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
                View submission
              </a>
            </p>
            <p style="margin:16px 0 0;font-size:12px;color:#71717a;word-break:break-all;">
              Or open: ${escapeHtml(confirmationUrl)}
            </p>`
          : ""
      }
    </main>
    <footer style="padding:16px 28px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">
      This message was sent by ${escapeHtml(config.fromName)} &lt;${escapeHtml(config.fromAddress)}&gt;.
      If you did not submit this form, you can ignore this email.
    </footer>
  </div>
</body>
</html>`;

  const text = [
    `We received your submission`,
    ``,
    `Form: ${request.formTitle}`,
    request.subjectName ? `Name: ${request.subjectName}` : null,
    `Reference: ${request.submissionId}`,
    `Submitted at: ${formatSubmittedAt(request.submittedAt)}`,
    ``,
    `Summary:`,
    textSummary || "(no fields)",
    confirmationUrl ? `\nView submission: ${confirmationUrl}` : null,
    ``,
    `— ${config.fromName}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    to: request.to,
    subject: title,
    html,
    text,
    headers: {
      "X-Dongle-Form-Type": request.formType,
      "X-Dongle-Submission-Id": request.submissionId,
    },
  };
}
