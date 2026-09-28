import { beforeEach, describe, expect, it } from "vitest";
import {
  buildConfirmationUrl,
  buildProjectSubmissionEmailRequest,
  clearQueuedConfirmationEmails,
  createEmailConfig,
  getQueuedConfirmationEmails,
  renderConfirmationEmail,
  sendFormConfirmationEmail,
} from "@/services/form-email-confirmation";

beforeEach(() => {
  window.localStorage.clear();
  clearQueuedConfirmationEmails();
});

describe("form email confirmation template", () => {
  it("renders accessible HTML with summary and confirmation link", () => {
    const config = createEmailConfig({ provider: "console" });
    const request = buildProjectSubmissionEmailRequest({
      to: "builder@example.com",
      submissionId: "sub_123",
      projectName: "Soroban Swap",
      category: "DeFi",
      websiteUrl: "https://example.com",
      description: "A swap dApp",
    });
    request.confirmationUrl = "https://dongle.app/submissions/confirm?submissionId=sub_123";

    const message = renderConfirmationEmail(request, config);

    expect(message.to).toBe("builder@example.com");
    expect(message.subject).toContain("Soroban Swap");
    expect(message.html).toContain('role="article"');
    expect(message.html).toContain('aria-label=');
    expect(message.html).toContain("Submission summary");
    expect(message.html).toContain("Soroban Swap");
    expect(message.html).toContain("https://dongle.app/submissions/confirm?submissionId=sub_123");
    expect(message.text).toContain("Reference: sub_123");
    expect(message.text).toContain("View submission:");
  });

  it("escapes HTML in user-provided values", () => {
    const config = createEmailConfig();
    const message = renderConfirmationEmail(
      {
        to: "a@b.com",
        formType: "project-submission",
        formTitle: "Project",
        submissionId: "1",
        summary: [{ label: "Name", value: '<script>alert("x")</script>' }],
      },
      config,
    );

    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
  });
});

describe("sendFormConfirmationEmail", () => {
  it("sends via console provider and queues the message", async () => {
    const result = await sendFormConfirmationEmail(
      buildProjectSubmissionEmailRequest({
        to: "user@dongle.app",
        submissionId: "abc",
        projectName: "Demo",
        category: "Tools",
        websiteUrl: "https://demo.app",
      }),
      { provider: "console" },
    );

    expect(result.status).toBe("sent");
    expect(result.provider).toBe("console");
    expect(getQueuedConfirmationEmails()).toHaveLength(1);
    expect(getQueuedConfirmationEmails()[0].message.html).toContain("Demo");
  });

  it("fails for invalid email addresses", async () => {
    const result = await sendFormConfirmationEmail(
      {
        to: "not-an-email",
        formType: "project-submission",
        formTitle: "Project",
        submissionId: "x",
        summary: [],
      },
      { provider: "console" },
    );

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/invalid/i);
  });

  it("skips when disabled", async () => {
    const result = await sendFormConfirmationEmail(
      buildProjectSubmissionEmailRequest({
        to: "user@dongle.app",
        submissionId: "abc",
        projectName: "Demo",
        category: "Tools",
        websiteUrl: "https://demo.app",
      }),
      { enabled: false },
    );

    expect(result.status).toBe("skipped");
  });

  it("builds confirmation URLs from config", () => {
    const url = buildConfirmationUrl(
      createEmailConfig({ appBaseUrl: "https://app.example/" }),
      "sub_9",
      "project-submission",
    );
    expect(url).toBe(
      "https://app.example/submissions/confirm?submissionId=sub_9&formType=project-submission",
    );
  });
});
