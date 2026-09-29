/**
 * Visual validation rule builder (Issue #544).
 */

export type {
  FieldRuleSet,
  FieldValueType,
  RuleBuilderDocument,
  RuleOperator,
  ValidationPreviewIssue,
  ValidationPreviewResult,
  ValidationRule,
  ZodExportResult,
} from "./types";

export { RULE_OPERATOR_META } from "./types";

export {
  createEmptyDocument,
  createFieldRuleSet,
  createRule,
  createRuleId,
  operatorsForType,
  reorderRules,
  touchDocument,
} from "./builder";

export { previewValidation } from "./preview";

export {
  exportDocumentJson,
  exportToZodSchema,
  importDocumentJson,
  importFromZodSchema,
} from "./zod-io";
