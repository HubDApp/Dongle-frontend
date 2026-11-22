/**
 * Claim Decision Email Template
 *
 * Sent to a claimant when an admin approves or rejects their ownership claim
 * for a project.
 */

import { baseEmailTemplate, htmlToText } from "./base-template";

export type ClaimDecision = "approved" | "rejected";

export interface ClaimDecisionEmailData {
  decision: ClaimDecision;
  projectName: string;
  projectId: string;
  recipientName?: string;
  reviewNote?: string;
}

export function generateClaimDecisionEmail(data: ClaimDecisionEmailData) {
  const greeting = data.recipientName ? `Hi ${data.recipientName},` : "Hello,";
  const isApproved = data.decision === "approved";

  const headline = isApproved
    ? `Ownership claim approved: ${data.projectName}`
    : `Ownership claim update: ${data.projectName}`;

  const summary = isApproved
    ? `<strong>${data.projectName}</strong> is now owned by your wallet. You can manage its profile, updates, and verification from your account.`
    : `We reviewed your ownership claim for <strong>${data.projectName}</strong> and were unable to approve it at this time.`;

  const noteBlock = data.reviewNote
    ? `
    <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 4px 0; font-weight: 600; color: #52525b;">Reviewer note</p>
      <p style="margin: 0; color: #52525b;">${data.reviewNote}</p>
    </div>`
    : "";

  const content = `
    <h1 style="font-size: 24px; margin: 0 0 24px 0; color: #18181b;">
      ${headline}
    </h1>

    <p style="margin: 0 0 16px 0;">
      ${greeting}
    </p>

    <p style="margin: 0 0 16px 0;">
      ${summary}
    </p>
    ${noteBlock}
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://dongle.app"}/projects/${data.projectId}" class="button">
      View Project
    </a>

    <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px;">
      You're receiving this email because you submitted an ownership claim for ${data.projectName}.
    </p>
  `;

  const html = baseEmailTemplate({
    title: headline,
    previewText: isApproved
      ? `Your claim for ${data.projectName} was approved`
      : `Your claim for ${data.projectName} was not approved`,
    content,
  });

  return {
    subject: isApproved
      ? `Claim approved: ${data.projectName}`
      : `Claim update: ${data.projectName}`,
    html,
    text: htmlToText(html),
  };
}
