/**
 * Form CRM integration types
 */

export type CrmProvider = "salesforce" | "hubspot" | "zapier" | "custom";

export type CrmSyncStatus = "success" | "failed" | "skipped" | "partial";

export interface CrmFieldMapping {
  /** Source field key from form data */
  source: string;
  /** Destination field key in the CRM */
  target: string;
  /** Optional transform: none | lowercase | uppercase | trim */
  transform?: "none" | "lowercase" | "uppercase" | "trim";
}

export interface CrmProviderConfig {
  provider: CrmProvider;
  enabled: boolean;
  /** API / webhook endpoint for the provider */
  endpointUrl: string;
  /** API token / key */
  apiKey?: string;
  /** Salesforce instance subdomain or HubSpot portal extras */
  extras?: Record<string, string>;
  /** Configurable field mapping */
  fieldMappings: CrmFieldMapping[];
}

export interface FormCrmConfig {
  enabled: boolean;
  providers: CrmProviderConfig[];
  /** Default mappings applied when a provider has none */
  defaultFieldMappings: CrmFieldMapping[];
}

export interface CrmSyncRequest {
  formType: string;
  submissionId: string;
  data: Record<string, unknown>;
  /** Optional contact email used by CRM lead/contact objects */
  email?: string;
}

export interface CrmProviderResult {
  provider: CrmProvider;
  status: CrmSyncStatus;
  remoteId?: string;
  mappedPayload: Record<string, unknown>;
  error?: string;
}

export interface CrmSyncResult {
  status: CrmSyncStatus;
  results: CrmProviderResult[];
}
