/**
 * Export / import between the visual rule builder and Zod schema text (Issue #544).
 */

import type {
  FieldRuleSet,
  FieldValueType,
  RuleBuilderDocument,
  RuleOperator,
  ValidationRule,
  ZodExportResult,
} from "./types";
import { createEmptyDocument, createRule, touchDocument } from "./builder";

function escapeTsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function msg(rule: ValidationRule): string | undefined {
  return rule.message?.trim() || undefined;
}

function chainStringRules(rules: ValidationRule[]): string {
  const enabled = rules.filter((r) => r.enabled);
  const required = enabled.some((r) => r.operator === "required");
  let expr = "z.string()";

  for (const rule of enabled) {
    const m = msg(rule);
    switch (rule.operator) {
      case "required":
        expr += m
          ? `.min(1, { message: "${escapeTsString(m)}" })`
          : `.min(1)`;
        break;
      case "minLength":
        expr += m
          ? `.min(${Number(rule.value ?? 0)}, { message: "${escapeTsString(m)}" })`
          : `.min(${Number(rule.value ?? 0)})`;
        break;
      case "maxLength":
        expr += m
          ? `.max(${Number(rule.value ?? 0)}, { message: "${escapeTsString(m)}" })`
          : `.max(${Number(rule.value ?? 0)})`;
        break;
      case "email":
        expr += m ? `.email({ message: "${escapeTsString(m)}" })` : `.email()`;
        break;
      case "url":
        expr += m ? `.url({ message: "${escapeTsString(m)}" })` : `.url()`;
        break;
      case "regex":
        expr += m
          ? `.regex(/${String(rule.value ?? "")}/, { message: "${escapeTsString(m)}" })`
          : `.regex(/${String(rule.value ?? "")}/)`;
        break;
      case "equals":
        expr += `.refine((v) => v === "${escapeTsString(String(rule.value ?? ""))}"${
          m ? `, { message: "${escapeTsString(m)}" }` : ""
        })`;
        break;
      case "oneOf": {
        const options = Array.isArray(rule.value)
          ? rule.value
          : String(rule.value ?? "")
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean);
        const lit = options.map((o) => `"${escapeTsString(String(o))}"`).join(", ");
        expr += m
          ? `.refine((v) => [${lit}].includes(v), { message: "${escapeTsString(m)}" })`
          : `.refine((v) => [${lit}].includes(v))`;
        break;
      }
      default:
        break;
    }
  }

  if (!required && !enabled.some((r) => r.operator === "minLength" && Number(r.value) > 0)) {
    expr += ".optional()";
  }

  return expr;
}

function chainNumberRules(rules: ValidationRule[]): string {
  const enabled = rules.filter((r) => r.enabled);
  const required = enabled.some((r) => r.operator === "required");
  let expr = "z.number()";

  for (const rule of enabled) {
    const m = msg(rule);
    switch (rule.operator) {
      case "min":
        expr += m
          ? `.min(${Number(rule.value ?? 0)}, { message: "${escapeTsString(m)}" })`
          : `.min(${Number(rule.value ?? 0)})`;
        break;
      case "max":
        expr += m
          ? `.max(${Number(rule.value ?? 0)}, { message: "${escapeTsString(m)}" })`
          : `.max(${Number(rule.value ?? 0)})`;
        break;
      case "integer":
        expr += m ? `.int({ message: "${escapeTsString(m)}" })` : `.int()`;
        break;
      case "positive":
        expr += m ? `.positive({ message: "${escapeTsString(m)}" })` : `.positive()`;
        break;
      default:
        break;
    }
  }

  if (!required) expr += ".optional()";
  return expr;
}

function chainBooleanRules(rules: ValidationRule[]): string {
  const enabled = rules.filter((r) => r.enabled);
  const required = enabled.some((r) => r.operator === "required");
  let expr = "z.boolean()";
  if (!required) expr += ".optional()";
  return expr;
}

function chainEnumRules(rules: ValidationRule[]): string {
  const enabled = rules.filter((r) => r.enabled);
  const oneOf = enabled.find((r) => r.operator === "oneOf");
  const options = oneOf
    ? Array.isArray(oneOf.value)
      ? oneOf.value.map(String)
      : String(oneOf.value ?? "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
    : ["option"];
  const lit = options.map((o) => `"${escapeTsString(o)}"`).join(", ");
  const required = enabled.some((r) => r.operator === "required");
  let expr = `z.enum([${lit}])`;
  if (!required) expr += ".optional()";
  return expr;
}

function fieldToZod(field: FieldRuleSet): string {
  switch (field.valueType) {
    case "number":
      return chainNumberRules(field.rules);
    case "boolean":
      return chainBooleanRules(field.rules);
    case "enum":
      return chainEnumRules(field.rules);
    case "string":
    default:
      return chainStringRules(field.rules);
  }
}

/** Generate TypeScript Zod object schema code from a builder document. */
export function exportToZodSchema(doc: RuleBuilderDocument): ZodExportResult {
  const lines = doc.fields.map((field) => {
    const comment = field.label ? `  /** ${escapeTsString(field.label)} */\n` : "";
    return `${comment}  ${JSON.stringify(field.fieldName)}: ${fieldToZod(field)},`;
  });

  const code = [
    `import { z } from "zod";`,
    ``,
    `/** Auto-generated from rule builder: ${escapeTsString(doc.name)} */`,
    `export const schema = z.object({`,
    ...lines,
    `});`,
    ``,
    `export type SchemaInput = z.infer<typeof schema>;`,
    ``,
  ].join("\n");

  return {
    code,
    json: touchDocument(doc),
  };
}

/**
 * Import an existing Zod object schema source string into a builder document.
 * Supports common z.string()/z.number()/z.boolean()/z.enum() chains.
 */
export function importFromZodSchema(
  source: string,
  name = "Imported schema",
): RuleBuilderDocument {
  const doc = createEmptyDocument(name);
  const objectMatch = source.match(/z\.object\(\{([\s\S]*?)\}\)/);
  if (!objectMatch) {
    throw new Error("Could not find a z.object({ ... }) schema to import");
  }

  const body = objectMatch[1];
  const fieldRegex =
    /(?:\/\*\*([\s\S]*?)\*\/\s*)?["']?([A-Za-z_][\w]*)["']?\s*:\s*(z\.[^,]+?)(?:,|$)/g;

  let match: RegExpExecArray | null;
  while ((match = fieldRegex.exec(body)) !== null) {
    const label = match[1]?.trim();
    const fieldName = match[2];
    const expr = match[3].trim();
    const { valueType, rules } = parseZodFieldExpression(expr);
    doc.fields.push({
      fieldName,
      label: label || fieldName,
      valueType,
      rules,
    });
  }

  if (doc.fields.length === 0) {
    throw new Error("No fields could be parsed from the Zod schema");
  }

  return touchDocument(doc);
}

function parseZodFieldExpression(expr: string): {
  valueType: FieldValueType;
  rules: ValidationRule[];
} {
  const rules: ValidationRule[] = [];
  let valueType: FieldValueType = "string";

  if (expr.includes("z.number()")) valueType = "number";
  else if (expr.includes("z.boolean()")) valueType = "boolean";
  else if (expr.includes("z.enum(")) valueType = "enum";

  const optional = /\.optional\(\)/.test(expr);
  if (!optional) {
    rules.push(createRule("required"));
  }

  const minLen = expr.match(/\.min\((\d+)/);
  if (minLen && valueType === "string") {
    const n = Number(minLen[1]);
    if (n > 1) rules.push(createRule("minLength", { value: n }));
  }

  const maxLen = expr.match(/\.max\((\d+)/);
  if (maxLen && valueType === "string") {
    rules.push(createRule("maxLength", { value: Number(maxLen[1]) }));
  }

  if (valueType === "number") {
    const min = expr.match(/\.min\(([-+]?\d+(?:\.\d+)?)/);
    if (min) rules.push(createRule("min", { value: Number(min[1]) }));
    const max = expr.match(/\.max\(([-+]?\d+(?:\.\d+)?)/);
    if (max) rules.push(createRule("max", { value: Number(max[1]) }));
    if (/\.int\(/.test(expr)) rules.push(createRule("integer"));
    if (/\.positive\(/.test(expr)) rules.push(createRule("positive"));
  }

  if (/\.email\(/.test(expr)) rules.push(createRule("email"));
  if (/\.url\(/.test(expr)) rules.push(createRule("url"));

  const regex = expr.match(/\.regex\(\/(.+?)\//);
  if (regex) rules.push(createRule("regex", { value: regex[1] }));

  const enumMatch = expr.match(/z\.enum\(\[([^\]]+)\]\)/);
  if (enumMatch) {
    const options = enumMatch[1]
      .split(",")
      .map((p) => p.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    rules.push(createRule("oneOf", { value: options }));
  }

  // Deduplicate operators while keeping order
  const seen = new Set<RuleOperator>();
  const unique = rules.filter((r) => {
    if (seen.has(r.operator)) return false;
    seen.add(r.operator);
    return true;
  });

  return { valueType, rules: unique };
}

/** Serialize the builder document as JSON for clipboard / file export. */
export function exportDocumentJson(doc: RuleBuilderDocument): string {
  return JSON.stringify(touchDocument(doc), null, 2);
}

/** Restore a builder document from previously exported JSON. */
export function importDocumentJson(raw: string): RuleBuilderDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON — paste an exported rule builder document");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as RuleBuilderDocument).version !== 1 ||
    !Array.isArray((parsed as RuleBuilderDocument).fields)
  ) {
    throw new Error("Unrecognized rule builder document format");
  }

  return touchDocument(parsed as RuleBuilderDocument);
}
