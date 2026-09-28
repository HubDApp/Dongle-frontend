/**
 * Form CRM integration service
 */

import {
  createCrmConfig,
  DEFAULT_CRM_CONFIG,
  DEFAULT_FIELD_MAPPINGS,
  HUBSPOT_DEFAULT_MAPPINGS,
  loadCrmProvidersFromEnv,
  SALESFORCE_DEFAULT_MAPPINGS,
} from "./config";
import { mapFormDataToCrm, mergeFieldMappings } from "./mappers";
import { syncProvider } from "./providers";
import type {
  CrmFieldMapping,
  CrmProviderConfig,
  CrmSyncRequest,
  CrmSyncResult,
  FormCrmConfig,
} from "./types";

/**
 * Sync a form submission to all configured CRM providers.
 */
export async function syncFormSubmissionToCrm(
  request: CrmSyncRequest,
  overrides: Partial<FormCrmConfig> = {},
): Promise<CrmSyncResult> {
  const envProviders = loadCrmProvidersFromEnv();
  const config = createCrmConfig({
    ...overrides,
    providers: overrides.providers ?? envProviders,
  });

  if (!config.enabled) {
    return { status: "skipped", results: [] };
  }

  const active = config.providers.filter((p) => p.enabled && p.endpointUrl);
  if (active.length === 0) {
    return { status: "skipped", results: [] };
  }

  const results = await Promise.all(
    active.map((provider) => {
      const fieldMappings = provider.fieldMappings?.length
        ? provider.fieldMappings
        : config.defaultFieldMappings;
      return syncProvider({ ...provider, fieldMappings }, request);
    }),
  );

  const successes = results.filter((r) => r.status === "success").length;
  const failures = results.filter((r) => r.status === "failed").length;

  let status: CrmSyncResult["status"] = "success";
  if (successes === 0 && failures > 0) status = "failed";
  else if (successes > 0 && failures > 0) status = "partial";
  else if (successes === 0 && failures === 0) status = "skipped";

  return { status, results };
}

/**
 * Helper to build a CRM sync request from project form values.
 */
export function buildProjectCrmSyncRequest(input: {
  submissionId: string;
  data: Record<string, unknown>;
  email?: string;
}): CrmSyncRequest {
  return {
    formType: "project-submission",
    submissionId: input.submissionId,
    data: {
      projectName: input.data.name ?? input.data.projectName,
      ...input.data,
    },
    email: input.email,
  };
}

export function createProviderConfig(
  partial: Omit<CrmProviderConfig, "fieldMappings"> & {
    fieldMappings?: CrmFieldMapping[];
  },
): CrmProviderConfig {
  const defaults =
    partial.provider === "salesforce"
      ? SALESFORCE_DEFAULT_MAPPINGS
      : partial.provider === "hubspot"
        ? HUBSPOT_DEFAULT_MAPPINGS
        : DEFAULT_FIELD_MAPPINGS;

  return {
    ...partial,
    enabled: partial.enabled !== false,
    fieldMappings: partial.fieldMappings?.length
      ? mergeFieldMappings(defaults, partial.fieldMappings)
      : defaults,
  };
}

export {
  DEFAULT_CRM_CONFIG,
  DEFAULT_FIELD_MAPPINGS,
  SALESFORCE_DEFAULT_MAPPINGS,
  HUBSPOT_DEFAULT_MAPPINGS,
  createCrmConfig,
  loadCrmProvidersFromEnv,
  mapFormDataToCrm,
  mergeFieldMappings,
};
