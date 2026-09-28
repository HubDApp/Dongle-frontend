/**
 * CRM provider adapters: Salesforce, HubSpot, Zapier, custom API
 */

import { mapFormDataToCrm } from "./mappers";
import type {
  CrmProviderConfig,
  CrmProviderResult,
  CrmSyncRequest,
} from "./types";

function createRemoteId(provider: string): string {
  return `${provider}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown>; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      ok: response.ok,
      status: response.status,
      json,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      json: {},
      error: error instanceof Error ? error.message : "CRM request failed",
    };
  }
}

function buildMappedPayload(
  provider: CrmProviderConfig,
  request: CrmSyncRequest,
): Record<string, unknown> {
  const source = {
    ...request.data,
    ...(request.email ? { email: request.email } : {}),
    submissionId: request.submissionId,
    formType: request.formType,
  };
  return mapFormDataToCrm(source, provider.fieldMappings);
}

export async function syncSalesforce(
  provider: CrmProviderConfig,
  request: CrmSyncRequest,
): Promise<CrmProviderResult> {
  const mappedPayload = buildMappedPayload(provider, request);
  // Lead-shaped payload for Salesforce REST create
  const body = {
    ...mappedPayload,
    Company: mappedPayload.Company || mappedPayload.company || "Dongle Submission",
    LastName: mappedPayload.LastName || mappedPayload.name || "Unknown",
  };

  const result = await postJson(provider.endpointUrl, body, {
    Authorization: `Bearer ${provider.apiKey || ""}`,
  });

  if (!result.ok) {
    return {
      provider: "salesforce",
      status: "failed",
      mappedPayload,
      error: result.error,
    };
  }

  return {
    provider: "salesforce",
    status: "success",
    remoteId: String(result.json.id || result.json.Id || createRemoteId("sf")),
    mappedPayload,
  };
}

export async function syncHubSpot(
  provider: CrmProviderConfig,
  request: CrmSyncRequest,
): Promise<CrmProviderResult> {
  const mappedPayload = buildMappedPayload(provider, request);
  const body = {
    properties: mappedPayload,
  };

  const result = await postJson(provider.endpointUrl, body, {
    Authorization: `Bearer ${provider.apiKey || ""}`,
  });

  if (!result.ok) {
    return {
      provider: "hubspot",
      status: "failed",
      mappedPayload,
      error: result.error,
    };
  }

  return {
    provider: "hubspot",
    status: "success",
    remoteId: String(result.json.id || createRemoteId("hs")),
    mappedPayload,
  };
}

export async function syncZapier(
  provider: CrmProviderConfig,
  request: CrmSyncRequest,
): Promise<CrmProviderResult> {
  const mappedPayload = buildMappedPayload(provider, request);
  const body = {
    ...mappedPayload,
    submissionId: request.submissionId,
    formType: request.formType,
    source: "dongle-form-crm",
  };

  const result = await postJson(provider.endpointUrl, body, {});

  if (!result.ok) {
    return {
      provider: "zapier",
      status: "failed",
      mappedPayload,
      error: result.error,
    };
  }

  return {
    provider: "zapier",
    status: "success",
    remoteId: createRemoteId("zap"),
    mappedPayload,
  };
}

/**
 * Custom integration API — POSTs mapped JSON with optional bearer token.
 */
export async function syncCustom(
  provider: CrmProviderConfig,
  request: CrmSyncRequest,
): Promise<CrmProviderResult> {
  const mappedPayload = buildMappedPayload(provider, request);
  const body = {
    provider: "custom",
    submissionId: request.submissionId,
    formType: request.formType,
    data: mappedPayload,
    raw: request.data,
  };

  const headers: Record<string, string> = {};
  if (provider.apiKey) {
    headers.Authorization = `Bearer ${provider.apiKey}`;
  }

  const result = await postJson(provider.endpointUrl, body, headers);

  if (!result.ok) {
    return {
      provider: "custom",
      status: "failed",
      mappedPayload,
      error: result.error,
    };
  }

  return {
    provider: "custom",
    status: "success",
    remoteId: String(result.json.id || createRemoteId("custom")),
    mappedPayload,
  };
}

export async function syncProvider(
  provider: CrmProviderConfig,
  request: CrmSyncRequest,
): Promise<CrmProviderResult> {
  if (!provider.enabled) {
    return {
      provider: provider.provider,
      status: "skipped",
      mappedPayload: {},
    };
  }

  switch (provider.provider) {
    case "salesforce":
      return syncSalesforce(provider, request);
    case "hubspot":
      return syncHubSpot(provider, request);
    case "zapier":
      return syncZapier(provider, request);
    case "custom":
      return syncCustom(provider, request);
    default:
      return {
        provider: provider.provider,
        status: "failed",
        mappedPayload: {},
        error: `Unsupported CRM provider: ${provider.provider}`,
      };
  }
}
