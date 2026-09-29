/**
 * Form submission email confirmation service
 */

import { buildConfirmationUrl, createEmailConfig, DEFAULT_EMAIL_CONFIG } from "./config";
import { renderConfirmationEmail } from "./template";
import type {
  FormEmailConfirmationConfig,
  FormEmailConfirmationRequest,
  FormEmailMessage,
  FormEmailSendResult,
  QueuedEmailRecord,
} from "./types";

const QUEUE_KEY = "dongle:form-email-queue";

function createId(): string {
  return `email_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readQueue(): QueuedEmailRecord[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedEmailRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(records: QueuedEmailRecord[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(records.slice(-100)));
}

async function deliverViaProvider(
  message: FormEmailMessage,
  config: FormEmailConfirmationConfig,
): Promise<FormEmailSendResult> {
  if (config.provider === "console") {
    if (typeof console !== "undefined") {
      console.info("[form-email] confirmation queued", {
        to: message.to,
        subject: message.subject,
      });
    }
    return {
      status: "sent",
      messageId: createId(),
      provider: "console",
    };
  }

  if (config.provider === "webhook") {
    if (!config.providerWebhookUrl) {
      return {
        status: "failed",
        provider: "webhook",
        error: "FORM_EMAIL_WEBHOOK_URL is not configured",
      };
    }
    const response = await fetch(config.providerWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      return {
        status: "failed",
        provider: "webhook",
        error: `Webhook responded ${response.status}`,
      };
    }
    return {
      status: "sent",
      messageId: createId(),
      provider: "webhook",
    };
  }

  if (config.provider === "resend") {
    if (!config.resendApiKey) {
      return {
        status: "failed",
        provider: "resend",
        error: "RESEND_API_KEY is not configured",
      };
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromAddress}>`,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        status: "failed",
        provider: "resend",
        error: detail || `Resend responded ${response.status}`,
      };
    }
    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    return {
      status: "sent",
      messageId: payload.id || createId(),
      provider: "resend",
    };
  }

  return {
    status: "failed",
    provider: String(config.provider),
    error: "Unknown email provider",
  };
}

/**
 * Build, send, and record a form submission confirmation email.
 */
export async function sendFormConfirmationEmail(
  request: FormEmailConfirmationRequest,
  overrides: Partial<FormEmailConfirmationConfig> = {},
): Promise<FormEmailSendResult> {
  const config = createEmailConfig(overrides);

  if (!config.enabled) {
    return { status: "skipped", provider: config.provider };
  }

  if (!isValidEmail(request.to)) {
    return {
      status: "failed",
      provider: config.provider,
      error: "Invalid recipient email",
    };
  }

  const confirmationUrl =
    request.confirmationUrl ||
    (config.requireConfirmationLink
      ? buildConfirmationUrl(config, request.submissionId, request.formType)
      : undefined);

  const enriched: FormEmailConfirmationRequest = {
    ...request,
    confirmationUrl,
    submittedAt: request.submittedAt || new Date().toISOString(),
  };

  const message = renderConfirmationEmail(enriched, config);

  try {
    const result = await deliverViaProvider(message, config);
    const record: QueuedEmailRecord = {
      id: result.messageId || createId(),
      request: enriched,
      message,
      result,
      createdAt: new Date().toISOString(),
    };
    const queue = readQueue();
    queue.push(record);
    writeQueue(queue);
    return result;
  } catch (error) {
    return {
      status: "failed",
      provider: config.provider,
      error: error instanceof Error ? error.message : "Failed to send confirmation email",
    };
  }
}

export function getQueuedConfirmationEmails(): QueuedEmailRecord[] {
  return readQueue();
}

export function clearQueuedConfirmationEmails(): void {
  writeQueue([]);
}

export function buildProjectSubmissionEmailRequest(input: {
  to: string;
  submissionId: string;
  projectName: string;
  category: string;
  websiteUrl: string;
  description?: string;
  locale?: string;
}): FormEmailConfirmationRequest {
  return {
    to: input.to,
    formType: "project-submission",
    formTitle: "Project registration",
    submissionId: input.submissionId,
    subjectName: input.projectName,
    locale: input.locale,
    summary: [
      { label: "Project name", value: input.projectName },
      { label: "Category", value: input.category },
      { label: "Website", value: input.websiteUrl },
      ...(input.description
        ? [{ label: "Description", value: input.description.slice(0, 240) }]
        : []),
    ],
  };
}

export { DEFAULT_EMAIL_CONFIG, createEmailConfig, buildConfirmationUrl };
