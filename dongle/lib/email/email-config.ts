/**
 * Email configuration
 * 
 * Centralized configuration for email service providers
 */

export interface EmailConfig {
  provider: "sendgrid" | "mailgun" | "none";
  enabled: boolean;
  from: {
    address: string;
    name: string;
  };
  queue: {
    batchSize: number;
    retryAttempts: number;
  };
}

export interface SendGridConfig {
  apiKey: string;
}

export interface MailgunConfig {
  apiKey: string;
  domain: string;
}

function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || "none") as EmailConfig["provider"];
  const enabled = process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";

  return {
    provider: enabled ? provider : "none",
    enabled,
    from: {
      address: process.env.EMAIL_FROM_ADDRESS || "noreply@dongle.app",
      name: process.env.EMAIL_FROM_NAME || "Dongle",
    },
    queue: {
      batchSize: parseInt(process.env.EMAIL_QUEUE_BATCH_SIZE || "10", 10),
      retryAttempts: parseInt(process.env.EMAIL_QUEUE_RETRY_ATTEMPTS || "3", 10),
    },
  };
}

function getSendGridConfig(): SendGridConfig | null {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return null;

  return { apiKey };
}

function getMailgunConfig(): MailgunConfig | null {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) return null;

  return { apiKey, domain };
}

export const emailConfig = getEmailConfig();
export const sendGridConfig = getSendGridConfig();
export const mailgunConfig = getMailgunConfig();

/**
 * Check if email service is properly configured
 */
export function isEmailConfigured(): boolean {
  if (!emailConfig.enabled) return false;

  switch (emailConfig.provider) {
    case "sendgrid":
      return sendGridConfig !== null;
    case "mailgun":
      return mailgunConfig !== null;
    default:
      return false;
  }
}
