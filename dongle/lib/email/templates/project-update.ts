/**
 * Project Update Email Template
 * 
 * Sent when a project the user follows receives an update
 */

import { baseEmailTemplate, htmlToText } from "./base-template";

export interface ProjectUpdateEmailData {
  recipientName?: string;
  projectName: string;
  projectId: string;
  updateType: "verified" | "new_review" | "status_change";
  updateDetails: string;
}

export function generateProjectUpdateEmail(data: ProjectUpdateEmailData) {
  const greeting = data.recipientName
    ? `Hi ${data.recipientName},`
    : "Hello,";

  const updateTypeText = {
    verified: "has been verified",
    new_review: "received a new review",
    status_change: "status has been updated",
  }[data.updateType];

  const content = `
    <h1 style="font-size: 24px; margin: 0 0 24px 0; color: #18181b;">
      Project Update: ${data.projectName}
    </h1>
    
    <p style="margin: 0 0 16px 0;">
      ${greeting}
    </p>
    
    <p style="margin: 0 0 16px 0;">
      <strong>${data.projectName}</strong> ${updateTypeText}.
    </p>
    
    <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0; color: #52525b;">
        ${data.updateDetails}
      </p>
    </div>
    
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://dongle.app"}/projects/${data.projectId}" class="button">
      View Project
    </a>
    
    <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px;">
      You're receiving this email because you're following ${data.projectName}.
    </p>
  `;

  const html = baseEmailTemplate({
    title: `Update: ${data.projectName}`,
    previewText: `${data.projectName} ${updateTypeText}`,
    content,
  });

  return {
    subject: `Update: ${data.projectName}`,
    html,
    text: htmlToText(html),
  };
}
