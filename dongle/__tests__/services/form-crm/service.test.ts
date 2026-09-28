import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProviderConfig,
  mapFormDataToCrm,
  mergeFieldMappings,
  syncFormSubmissionToCrm,
  SALESFORCE_DEFAULT_MAPPINGS,
  HUBSPOT_DEFAULT_MAPPINGS,
} from "@/services/form-crm";

describe("CRM field mapping", () => {
  it("maps and transforms form fields", () => {
    const mapped = mapFormDataToCrm(
      {
        email: "  User@Example.COM ",
        projectName: "  Dongle ",
        websiteUrl: "https://dongle.app",
      },
      [
        { source: "email", target: "Email", transform: "lowercase" },
        { source: "projectName", target: "Company", transform: "trim" },
        { source: "websiteUrl", target: "Website", transform: "trim" },
      ],
    );

    expect(mapped).toEqual({
      Email: "  user@example.com ",
      Company: "Dongle",
      Website: "https://dongle.app",
    });
  });

  it("merges overrides over defaults", () => {
    const merged = mergeFieldMappings(SALESFORCE_DEFAULT_MAPPINGS, [
      { source: "email", target: "WorkEmail", transform: "lowercase" },
    ]);
    const emailMapping = merged.find((m) => m.source === "email");
    expect(emailMapping?.target).toBe("WorkEmail");
  });
});

describe("syncFormSubmissionToCrm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips when no providers are configured", async () => {
    const result = await syncFormSubmissionToCrm(
      {
        formType: "project-submission",
        submissionId: "1",
        data: { name: "Demo" },
      },
      { providers: [] },
    );

    expect(result.status).toBe("skipped");
  });

  it("syncs to Salesforce, HubSpot, Zapier, and custom APIs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "remote-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await syncFormSubmissionToCrm(
      {
        formType: "project-submission",
        submissionId: "sub_99",
        email: "lead@example.com",
        data: {
          name: "Ada",
          projectName: "Lovelace Tools",
          websiteUrl: "https://lovelace.tools",
          description: "Dev tooling",
          primaryCategory: "Tools",
        },
      },
      {
        providers: [
          createProviderConfig({
            provider: "salesforce",
            enabled: true,
            endpointUrl: "https://sf.example/services/data/v59.0/sobjects/Lead",
            apiKey: "sf-token",
            fieldMappings: SALESFORCE_DEFAULT_MAPPINGS,
          }),
          createProviderConfig({
            provider: "hubspot",
            enabled: true,
            endpointUrl: "https://api.hubapi.com/crm/v3/objects/contacts",
            apiKey: "hs-token",
            fieldMappings: HUBSPOT_DEFAULT_MAPPINGS,
          }),
          createProviderConfig({
            provider: "zapier",
            enabled: true,
            endpointUrl: "https://hooks.zapier.com/hooks/catch/1/abc",
          }),
          createProviderConfig({
            provider: "custom",
            enabled: true,
            endpointUrl: "https://crm.example/api/leads",
            apiKey: "custom-key",
          }),
        ],
      },
    );

    expect(result.status).toBe("success");
    expect(result.results).toHaveLength(4);
    expect(result.results.every((r) => r.status === "success")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const sfBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sfBody.Email).toBe("lead@example.com");
    expect(sfBody.Company).toBe("Lovelace Tools");

    const hsBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(hsBody.properties.email).toBe("lead@example.com");
    expect(hsBody.properties.company).toBe("Lovelace Tools");
  });

  it("reports partial success when one provider fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "ok" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "boom" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await syncFormSubmissionToCrm(
      {
        formType: "project-submission",
        submissionId: "sub_partial",
        data: { name: "Demo", projectName: "Demo" },
        email: "a@b.com",
      },
      {
        providers: [
          createProviderConfig({
            provider: "zapier",
            enabled: true,
            endpointUrl: "https://hooks.zapier.com/ok",
          }),
          createProviderConfig({
            provider: "custom",
            enabled: true,
            endpointUrl: "https://crm.example/fail",
          }),
        ],
      },
    );

    expect(result.status).toBe("partial");
  });
});
