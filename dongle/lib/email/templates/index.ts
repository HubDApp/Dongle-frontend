/**
 * Email Templates Index
 * 
 * Exports all email templates
 */

export { baseEmailTemplate, htmlToText } from "./base-template";
export type { BaseTemplateProps } from "./base-template";

export { generateProjectUpdateEmail } from "./project-update";
export type { ProjectUpdateEmailData } from "./project-update";

export { generateReviewMentionEmail } from "./review-mention";
export type { ReviewMentionEmailData } from "./review-mention";

export { generateReviewCommentEmail } from "./review-comment";
export type { ReviewCommentEmailData } from "./review-comment";
