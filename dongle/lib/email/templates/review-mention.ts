/**
 * Review Mention Email Template
 * 
 * Sent when a user is mentioned in a review comment
 */

import { baseEmailTemplate, htmlToText } from "./base-template";

export interface ReviewMentionEmailData {
  recipientName?: string;
  mentionerName: string;
  projectName: string;
  projectId: string;
  reviewId: string;
  commentExcerpt: string;
}

export function generateReviewMentionEmail(data: ReviewMentionEmailData) {
  const greeting = data.recipientName
    ? `Hi ${data.recipientName},`
    : "Hello,";

  const content = `
    <h1 style="font-size: 24px; margin: 0 0 24px 0; color: #18181b;">
      You were mentioned in a review
    </h1>
    
    <p style="margin: 0 0 16px 0;">
      ${greeting}
    </p>
    
    <p style="margin: 0 0 16px 0;">
      <strong>${data.mentionerName}</strong> mentioned you in a review for <strong>${data.projectName}</strong>.
    </p>
    
    <div style="background-color: #f4f4f5; padding: 20px; border-left: 4px solid #3b82f6; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0; color: #3f3f46; font-style: italic;">
        "${data.commentExcerpt}${data.commentExcerpt.length > 150 ? "..." : ""}"
      </p>
    </div>
    
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://dongle.app"}/projects/${data.projectId}#review-${data.reviewId}" class="button">
      View Review
    </a>
    
    <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px;">
      You're receiving this email because someone mentioned you in a review.
    </p>
  `;

  const html = baseEmailTemplate({
    title: "You were mentioned in a review",
    previewText: `${data.mentionerName} mentioned you in a review for ${data.projectName}`,
    content,
  });

  return {
    subject: `${data.mentionerName} mentioned you in a review`,
    html,
    text: htmlToText(html),
  };
}
