/**
 * Email Service
 * 
 * Unified interface for sending emails via SendGrid or Mailgun
 */

import {
  emailConfig,
  sendGridConfig,
  mailgunConfig,
  isEmailConfigured,
} from "./email-config";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(message: EmailMessage): Promise<EmailResult> {
  if (!sendGridConfig) {
    return { success: false, error: "SendGrid not configured" };
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendGridConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: Array.isArray(message.to)
              ? message.to.map((email) => ({ email }))
              : [{ email: message.to }],
          },
        ],
        from: {
          email: emailConfig.from.address,
          name: emailConfig.from.name,
        },
        reply_to: message.replyTo ? { email: message.replyTo } : undefined,
        subject: message.subject,
        content: [
          {
            type: "text/html",
            value: message.html,
          },
          ...(message.text
            ? [{ type: "text/plain", value: message.text }]
            : []),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `SendGrid error: ${error}` };
    }

    // SendGrid returns 202 Accepted with X-Message-Id header
    const messageId = response.headers.get("x-message-id") || undefined;
    return { success: true, messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send email via Mailgun
 */
async function sendViaMailgun(message: EmailMessage): Promise<EmailResult> {
  if (!mailgunConfig) {
    return { success: false, error: "Mailgun not configured" };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("from", `${emailConfig.from.name} <${emailConfig.from.address}>`);
    
    if (Array.isArray(message.to)) {
      message.to.forEach((email) => formData.append("to", email));
    } else {
      formData.append("to", message.to);
    }
    
    formData.append("subject", message.subject);
    formData.append("html", message.html);
    
    if (message.text) {
      formData.append("text", message.text);
    }
    
    if (message.replyTo) {
      formData.append("h:Reply-To", message.replyTo);
    }

    const response = await fetch(
      `https://api.mailgun.net/v3/${mailgunConfig.domain}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${mailgunConfig.apiKey}`).toString("base64")}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Mailgun error: ${error}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send an email using the configured provider
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.warn("[email] Email service not configured, skipping send");
    return { success: false, error: "Email service not configured" };
  }

  console.log(`[email] Sending to ${Array.isArray(message.to) ? message.to.join(", ") : message.to}: ${message.subject}`);

  try {
    let result: EmailResult;

    switch (emailConfig.provider) {
      case "sendgrid":
        result = await sendViaSendGrid(message);
        break;
      case "mailgun":
        result = await sendViaMailgun(message);
        break;
      default:
        result = { success: false, error: "No email provider configured" };
    }

    if (result.success) {
      console.log(`[email] Sent successfully. Message ID: ${result.messageId}`);
    } else {
      console.error(`[email] Failed to send: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[email] Exception: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send multiple emails (batch)
 */
export async function sendBatchEmails(
  messages: EmailMessage[]
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];
  const batchSize = emailConfig.queue.batchSize;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(sendEmail));
    results.push(...batchResults);

    // Small delay between batches to avoid rate limits
    if (i + batchSize < messages.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
