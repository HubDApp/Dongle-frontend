/**
 * CRM integration configuration + default field mappings
 */

import type { CrmFieldMapping, FormCrmConfig, CrmProviderConfig } from "./types";

export const DEFAULT_FIELD_MAPPINGS: CrmFieldMapping[] = [
  { source: "name", target: "name", transform: "trim" },
  { source: "projectName", target: "company", transform: "trim" },
  { source: "email", target: "email", transform: "lowercase" },
  { source: "websiteUrl", target: "website", transform: "trim" },
  { source: "description", target: "description", transform: "trim" },
  { source: "primaryCategory", target: "category", transform: "trim" },
  { source: "githubUrl", target: "repository_url", transform: "trim" },
];

export const SALESFORCE_DEFAULT_MAPPINGS: CrmFieldMapping[] = [
  { source: "name", target: "LastName", transform: "trim" },
  { source: "projectName", target: "Company", transform: "trim" },
  { source: "email", target: "Email", transform: "lowercase" },
  { source: "websiteUrl", target: "Website", transform: "trim" },
  { source: "description", target: "Description", transform: "trim" },
  { source: "primaryCategory", target: "Industry", transform: "trim" },
];

export const HUBSPOT_DEFAULT_MAPPINGS: CrmFieldMapping[] = [
  { source: "email", target: "email", transform: "lowercase" },
  { source: "name", target: "firstname", transform: "trim" },
  { source: "projectName", target: "company", transform: "trim" },
  { source: "websiteUrl", target: "website", transform: "trim" },
  { source: "description", target: "message", transform: "trim" },
];

export const DEFAULT_CRM_CONFIG: FormCrmConfig = {
  enabled: true,
  providers: [],
  defaultFieldMappings: DEFAULT_FIELD_MAPPINGS,
};

export function createCrmConfig(overrides: Partial<FormCrmConfig> = {}): FormCrmConfig {
  return {
    ...DEFAULT_CRM_CONFIG,
    ...overrides,
    providers: overrides.providers ?? DEFAULT_CRM_CONFIG.providers,
    defaultFieldMappings:
      overrides.defaultFieldMappings ?? DEFAULT_CRM_CONFIG.defaultFieldMappings,
  };
}

/**
 * Load CRM providers from environment variables.
 *
 * Salesforce: SALESFORCE_API_URL + SALESFORCE_API_KEY
 * HubSpot:    HUBSPOT_API_KEY (optional HUBSPOT_API_URL)
 * Zapier:     ZAPIER_HOOK_URL
 * Custom:     CRM_CUSTOM_API_URL + CRM_CUSTOM_API_KEY
 * Optional JSON: FORM_CRM_PROVIDERS
 */
export function loadCrmProvidersFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): CrmProviderConfig[] {
  const providers: CrmProviderConfig[] = [];

  if (env.SALESFORCE_API_URL && env.SALESFORCE_API_KEY) {
    providers.push({
      provider: "salesforce",
      enabled: true,
      endpointUrl: env.SALESFORCE_API_URL,
      apiKey: env.SALESFORCE_API_KEY,
      fieldMappings: SALESFORCE_DEFAULT_MAPPINGS,
    });
  }

  if (env.HUBSPOT_API_KEY) {
    providers.push({
      provider: "hubspot",
      enabled: true,
      endpointUrl: env.HUBSPOT_API_URL || "https://api.hubapi.com/crm/v3/objects/contacts",
      apiKey: env.HUBSPOT_API_KEY,
      fieldMappings: HUBSPOT_DEFAULT_MAPPINGS,
    });
  }

  if (env.ZAPIER_HOOK_URL) {
    providers.push({
      provider: "zapier",
      enabled: true,
      endpointUrl: env.ZAPIER_HOOK_URL,
      fieldMappings: DEFAULT_FIELD_MAPPINGS,
    });
  }

  if (env.CRM_CUSTOM_API_URL) {
    providers.push({
      provider: "custom",
      enabled: true,
      endpointUrl: env.CRM_CUSTOM_API_URL,
      apiKey: env.CRM_CUSTOM_API_KEY,
      fieldMappings: DEFAULT_FIELD_MAPPINGS,
    });
  }

  if (env.FORM_CRM_PROVIDERS) {
    try {
      const parsed = JSON.parse(env.FORM_CRM_PROVIDERS) as CrmProviderConfig[];
      for (const item of parsed) {
        if (!item.provider || !item.endpointUrl) continue;
        providers.push({
          ...item,
          enabled: item.enabled !== false,
          fieldMappings: item.fieldMappings?.length
            ? item.fieldMappings
            : DEFAULT_FIELD_MAPPINGS,
        });
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return providers;
}
