/**
 * Post-submit orchestration for email confirmation, webhooks, and CRM sync.
 * Failures are isolated so one integration never blocks the others.
 */

import {
  buildProjectSubmissionEmailRequest,
  sendFormConfirmationEmail,
  type FormEmailSendResult,
} from "@/services/form-email-confirmation";
import {
  buildFormWebhookPayload,
  dispatchFormWebhooks,
  type WebhookDispatchResult,
} from "@/services/form-webhooks";
import {
  buildProjectCrmSyncRequest,
  syncFormSubmissionToCrm,
  type CrmSyncResult,
} from "@/services/form-crm";

export interface FormIntegrationInput {
  submissionId: string;
  formType?: string;
  data: Record<string, unknown>;
  /** Recipient for confirmation email — skipped when missing/invalid */
  email?: string;
  locale?: string;
  metadata?: Record<string, string>;
}

export interface FormIntegrationResult {
  email?: FormEmailSendResult;
  webhooks?: WebhookDispatchResult;
  crm?: CrmSyncResult;
}

export async function runFormIntegrations(
  input: FormIntegrationInput,
): Promise<FormIntegrationResult> {
  const formType = input.formType || "project-submission";
  const result: FormIntegrationResult = {};

  const tasks: Array<Promise<void>> = [];

  if (input.email) {
    tasks.push(
      (async () => {
        try {
          const request = buildProjectSubmissionEmailRequest({
            to: input.email!,
            submissionId: input.submissionId,
            projectName: String(input.data.name || input.data.projectName || "Submission"),
            category: String(input.data.primaryCategory || input.data.category || "n/a"),
            websiteUrl: String(input.data.websiteUrl || ""),
            description:
              typeof input.data.description === "string" ? input.data.description : undefined,
            locale: input.locale,
          });
          result.email = await sendFormConfirmationEmail(request);
        } catch (error) {
          result.email = {
            status: "failed",
            provider: "unknown",
            error: error instanceof Error ? error.message : "Email confirmation failed",
          };
        }
      })(),
    );
  }

  tasks.push(
    (async () => {
      try {
        const payload = buildFormWebhookPayload({
          formType,
          submissionId: input.submissionId,
          data: input.data,
          metadata: input.metadata,
        });
        result.webhooks = await dispatchFormWebhooks(payload);
      } catch (error) {
        result.webhooks = {
          status: "failed",
          deliveries: [],
        };
        if (typeof console !== "undefined") {
          console.error("[form-integrations] webhook dispatch failed", error);
        }
      }
    })(),
  );

  tasks.push(
    (async () => {
      try {
        const crmRequest = buildProjectCrmSyncRequest({
          submissionId: input.submissionId,
          data: input.data,
          email: input.email,
        });
        result.crm = await syncFormSubmissionToCrm(crmRequest);
      } catch (error) {
        result.crm = {
          status: "failed",
          results: [],
        };
        if (typeof console !== "undefined") {
          console.error("[form-integrations] CRM sync failed", error);
        }
      }
    })(),
  );

  await Promise.all(tasks);
  return result;
}
