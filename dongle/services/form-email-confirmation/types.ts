/**
 * Form submission email confirmation types
 */

export type EmailDeliveryStatus = "queued" | "sent" | "failed" | "skipped";

export interface FormSubmissionSummaryItem {
  label: string;
  value: string;
}

export interface FormEmailConfirmationRequest {
  /** Recipient email address */
  to: string;
  /** Form identifier, e.g. project-submission */
  formType: string;
  /** Human-readable form title */
  formTitle: string;
  /** Submission id used in confirmation links */
  submissionId: string;
  /** Optional project / entity name */
  subjectName?: string;
  /** Field summary rows shown in the email body */
  summary: FormSubmissionSummaryItem[];
  /** Absolute confirmation / view link when needed */
  confirmationUrl?: string;
  /** Locale for template copy */
  locale?: string;
  /** ISO timestamp of submission */
  submittedAt?: string;
}

export interface FormEmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface FormEmailSendResult {
  status: EmailDeliveryStatus;
  messageId?: string;
  provider: string;
  error?: string;
}

export interface FormEmailConfirmationConfig {
  enabled: boolean;
  /** from address used in templates / providers */
  fromAddress: string;
  fromName: string;
  /** Absolute base URL for confirmation links */
  appBaseUrl: string;
  /** Provider id: console | resend | webhook */
  provider: "console" | "resend" | "webhook";
  /** Optional outbound webhook used when provider === "webhook" */
  providerWebhookUrl?: string;
  /** Resend API key when provider === "resend" */
  resendApiKey?: string;
  requireConfirmationLink: boolean;
}

export interface QueuedEmailRecord {
  id: string;
  request: FormEmailConfirmationRequest;
  message: FormEmailMessage;
  result: FormEmailSendResult;
  createdAt: string;
}
