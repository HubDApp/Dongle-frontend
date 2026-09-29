import { describe, it, expect, beforeEach, vi } from "vitest";
import { formSubmissionNotificationService } from "@/services/notification/form-submission-notification.service";

describe("Form Submission Notification Service", () => {
  beforeEach(() => {
    formSubmissionNotificationService._clearForTesting();
  });

  it("manages notification preferences correctly", () => {
    const defaultPrefs = formSubmissionNotificationService.getPreferences();
    expect(defaultPrefs.emailEnabled).toBe(true);
    expect(defaultPrefs.inAppEnabled).toBe(true);
    expect(defaultPrefs.slackEnabled).toBe(false);

    const updated = formSubmissionNotificationService.updatePreferences({
      slackEnabled: true,
      slackWebhookUrl: "https://hooks.slack.com/services/test",
      recipientEmail: "test@dongle.app",
    });

    expect(updated.slackEnabled).toBe(true);
    expect(updated.slackWebhookUrl).toBe("https://hooks.slack.com/services/test");
    expect(updated.recipientEmail).toBe("test@dongle.app");
  });

  it("throttles duplicate notifications within the throttle window", async () => {
    formSubmissionNotificationService.updatePreferences({
      throttleWindowMs: 5000,
      emailEnabled: true,
      inAppEnabled: true,
    });

    const payload = {
      submissionId: "sub-123",
      type: "project_submitted" as const,
      recipientAddress: "G1234",
      projectName: "Test DApp",
      submitter: "G1234",
    };

    // First notification should go through
    const firstResult = await formSubmissionNotificationService.notify(payload);
    expect(firstResult.throttled).toBe(false);
    expect(firstResult.emailSent).toBe(true);
    expect(firstResult.inAppSent).toBe(true);

    // Immediate second notification with same ID/key should be throttled
    const secondResult = await formSubmissionNotificationService.notify(payload);
    expect(secondResult.throttled).toBe(true);
    expect(secondResult.emailSent).toBe(false);
    expect(secondResult.inAppSent).toBe(false);
  });

  it("sends email notifications and records them for testing", async () => {
    formSubmissionNotificationService.updatePreferences({
      emailEnabled: true,
      recipientEmail: "admin@dongle.app",
    });

    await formSubmissionNotificationService.sendEmailNotification(
      "admin@dongle.app",
      "Subject",
      "Body",
      "sub-999"
    );

    const sentEmails = formSubmissionNotificationService._getSentEmailsForTesting();
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe("admin@dongle.app");
    expect(sentEmails[0].subject).toBe("Subject");
    expect(sentEmails[0].body).toBe("Body");
    expect(sentEmails[0].submissionId).toBe("sub-999");
  });

  it("sends slack notifications when enabled and records them for testing", async () => {
    formSubmissionNotificationService.updatePreferences({
      slackEnabled: true,
      slackWebhookUrl: "https://hooks.slack.com/services/test/webhook",
    });

    const payload = {
      submissionId: "sub-slack",
      type: "project_submitted" as const,
      recipientAddress: "G1234",
      projectName: "Slack DApp",
      submitter: "G1234",
    };

    const result = await formSubmissionNotificationService.notify(payload);
    expect(result.slackSent).toBe(true);

    const sentSlack = formSubmissionNotificationService._getSentSlackForTesting();
    expect(sentSlack).toHaveLength(1);
    expect(sentSlack[0].webhookUrl).toBe("https://hooks.slack.com/services/test/webhook");
    expect(sentSlack[0].text).toContain("Slack DApp");
  });
});
