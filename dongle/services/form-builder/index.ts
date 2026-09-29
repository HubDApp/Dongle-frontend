/**
 * Form builder service — versioning, branching, i18n, and confirmation.
 */

export type {
  BranchCondition,
  BranchOperator,
  BranchRule,
  FieldValidationError,
  FormAnswers,
  FormChangelogEntry,
  FormFieldDefinition,
  FormFieldOption,
  FormFieldType,
  FormFieldValidation,
  FormNextStep,
  FormSchemaSnapshot,
  FormSectionDefinition,
  FormSubmissionRecord,
  FormVersionRecord,
  FormVersionStore,
  LocalizedText,
  PathValidationResult,
} from "./types";

export {
  FORM_VERSION_SCHEMA,
  FORM_VERSION_STORAGE_PREFIX,
  clearVersions,
  ensureInitialVersion,
  getActiveVersion,
  getChangelog,
  getVersion,
  getVersionStore,
  listVersions,
  publishVersion,
  revertToVersion,
} from "./versioning";

export {
  applyAnswerChange,
  evaluateCondition,
  getActivePaths,
  getVisibleFields,
  getVisibleSectionIds,
  getVisibleSections,
  pruneAnswersForPath,
  ruleMatches,
  validatePath,
} from "./branching";

export {
  buildAnswerSummaryLabels,
  resolveFieldCopy,
  resolveFormDescription,
  resolveFormTitle,
  resolveLocalizedText,
  resolveSectionCopy,
  schemaSupportsLocale,
} from "./i18n";
export type { ResolvedFieldCopy, ResolvedSectionCopy } from "./i18n";

export {
  FORM_SUBMISSION_STORAGE_KEY,
  LAST_CONFIRMATION_STORAGE_KEY,
  buildSubmissionSummary,
  clearSubmissions,
  formatAnswerValue,
  generateConfirmationNumber,
  getDefaultNextSteps,
  getLastConfirmationNumber,
  getSubmission,
  submitForm,
} from "./submission";
export type {
  SubmitFormFailure,
  SubmitFormOptions,
  SubmitFormResult,
} from "./submission";

export { DEMO_FORM_ID, demoIntakeSchema } from "./demo-schema";
