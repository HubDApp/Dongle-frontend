/**
 * Form CRM integration exports
 */

export {
  DEFAULT_CRM_CONFIG,
  DEFAULT_FIELD_MAPPINGS,
  SALESFORCE_DEFAULT_MAPPINGS,
  HUBSPOT_DEFAULT_MAPPINGS,
  createCrmConfig,
  loadCrmProvidersFromEnv,
} from "./config";
export { mapFormDataToCrm, mergeFieldMappings } from "./mappers";
export {
  syncSalesforce,
  syncHubSpot,
  syncZapier,
  syncCustom,
  syncProvider,
} from "./providers";
export {
  syncFormSubmissionToCrm,
  buildProjectCrmSyncRequest,
  createProviderConfig,
} from "./service";
export type {
  CrmProvider,
  CrmSyncStatus,
  CrmFieldMapping,
  CrmProviderConfig,
  FormCrmConfig,
  CrmSyncRequest,
  CrmProviderResult,
  CrmSyncResult,
} from "./types";
