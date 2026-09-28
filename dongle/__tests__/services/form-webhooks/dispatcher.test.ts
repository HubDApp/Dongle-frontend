import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFormWebhookPayload,
  createWebhookConfig,
  dispatchFormWebhooks,
  sendTestWebhook,
  signWebhookPayload,
  verifyWebhookSignature,
} from "@/services/form-webhooks";

describe("webhook signatures", () => {
  it("signs and verifies payloads", async () => {
    const body = JSON.stringify({ hello: "world" });
    const signature = await signWebhookPayload("test-secret", body);

    expect(signature.startsWith("sha256=")).toBe(true);
    expect(await verifyWebhookSignature("test-secret", body, signature)).toBe(true);
    expect(await verifyWebhookSignature("wrong-secret", body, signature)).toBe(false);
    expect(await verifyWebhookSignature("test-secret", body, null)).toBe(false);
  });
});

describe("dispatchFormWebhooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips when no endpoints are configured", async () => {
    const result = await dispatchFormWebhooks(
      buildFormWebhookPayload({
        formType: "project-submission",
        submissionId: "1",
        data: { name: "Demo" },
      }),
      { endpoints: [] },
    );

    expect(result.status).toBe("skipped");
  });

  it("sends signed payload and retries on failure then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.stubGlobal("fetch", fetchMock);

    const payload = buildFormWebhookPayload({
      formType: "project-submission",
      submissionId: "sub_1",
      data: { name: "Demo" },
    });

    const result = await dispatchFormWebhooks(payload, {
      endpoints: [
        {
          id: "primary",
          url: "https://hooks.example.com/dongle",
          secret: "super-secret",
          enabled: true,
        },
      ],
      maxRetries: 3,
      retryBaseDelayMs: 1,
    });

    expect(result.status).toBe("success");
    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries[0].attempts).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall[0]).toBe("https://hooks.example.com/dongle");
    expect(firstCall[1].headers["X-Dongle-Signature"]).toMatch(/^sha256=/);
    expect(firstCall[1].headers["Content-Type"]).toBe("application/json");
  });

  it("marks delivery failed after exhausting retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    const result = await dispatchFormWebhooks(
      buildFormWebhookPayload({
        formType: "project-submission",
        submissionId: "sub_2",
        data: { name: "Demo" },
      }),
      {
        endpoints: [
          {
            id: "primary",
            url: "https://hooks.example.com/fail",
            secret: "secret",
            enabled: true,
          },
        ],
        maxRetries: 2,
        retryBaseDelayMs: 1,
      },
    );

    expect(result.status).toBe("failed");
    expect(result.deliveries[0].attempts).toHaveLength(2);
  });
});

describe("sendTestWebhook", () => {
  it("requires a URL when none is configured", async () => {
    const result = await sendTestWebhook({});
    expect(result.status).toBe("failed");
    expect(result.deliveries[0].error).toMatch(/No webhook URL/i);
  });

  it("posts a test event when URL is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTestWebhook({
      url: "https://hooks.example.com/test",
      secret: "abc",
    });

    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.event).toBe("form.submitted");
    expect(body.formType).toBe("webhook-test");
  });
});

describe("createWebhookConfig", () => {
  it("merges overrides", () => {
    const config = createWebhookConfig({ maxRetries: 5 });
    expect(config.maxRetries).toBe(5);
    expect(config.signatureHeader).toBe("X-Dongle-Signature");
  });
});
