/**
 * Form email confirmation exports
 */

export {
  DEFAULT_EMAIL_CONFIG,
  buildConfirmationUrl,
  createEmailConfig,
} from "./config";
export { renderConfirmationEmail } from "./template";
export {
  sendFormConfirmationEmail,
  getQueuedConfirmationEmails,
  clearQueuedConfirmationEmails,
  buildProjectSubmissionEmailRequest,
} from "./service";
export type {
  EmailDeliveryStatus,
  FormSubmissionSummaryItem,
  FormEmailConfirmationRequest,
  FormEmailMessage,
  FormEmailSendResult,
  FormEmailConfirmationConfig,
  QueuedEmailRecord,
} from "./types";
