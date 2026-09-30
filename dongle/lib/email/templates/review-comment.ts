/**
 * Review Comment Email Template
 * 
 * Sent when someone comments on a user's review
 */

import { baseEmailTemplate, htmlToText } from "./base-template";

export interface ReviewCommentEmailData {
  recipientName?: string;
  commenterName: string;
  projectName: string;
  projectId: string;
  reviewId: string;
  commentText: string;
}

export function generateReviewCommentEmail(data: ReviewCommentEmailData) {
  const greeting = data.recipientName
    ? `Hi ${data.recipientName},`
    : "Hello,";

  const content = `
    <h1 style="font-size: 24px; margin: 0 0 24px 0; color: #18181b;">
      New comment on your review
    </h1>
    
    <p style="margin: 0 0 16px 0;">
      ${greeting}
    </p>
    
    <p style="margin: 0 0 16px 0;">
      <strong>${data.commenterName}</strong> commented on your review of <strong>${data.projectName}</strong>.
    </p>
    
    <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a; text-transform: uppercase; font-weight: 600;">
        Comment
      </p>
      <p style="margin: 0; color: #3f3f46;">
        ${data.commentText}
      </p>
    </div>
    
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://dongle.app"}/projects/${data.projectId}#review-${data.reviewId}" class="button">
      View Comment
    </a>
    
    <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px;">
      You're receiving this email because someone commented on your review.
    </p>
  `;

  const html = baseEmailTemplate({
    title: "New comment on your review",
    previewText: `${data.commenterName} commented on your review of ${data.projectName}`,
    content,
  });

  return {
    subject: `New comment on your review of ${data.projectName}`,
    html,
    text: htmlToText(html),
  };
}
