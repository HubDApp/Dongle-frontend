/**
 * Unit tests for the visual validation rule builder (Issue #544).
 */

import { describe, expect, it } from "vitest";
import {
  createEmptyDocument,
  createFieldRuleSet,
  createRule,
  exportDocumentJson,
  exportToZodSchema,
  importDocumentJson,
  importFromZodSchema,
  previewValidation,
  reorderRules,
} from "@/services/validation-rule-builder";

describe("reorderRules", () => {
  it("moves a rule via drag-and-drop indices", () => {
    const a = createRule("required");
    const b = createRule("email");
    const c = createRule("minLength", { value: 3 });
    expect(reorderRules([a, b, c], 0, 2).map((r) => r.operator)).toEqual([
      "email",
      "minLength",
      "required",
    ]);
  });
});

describe("previewValidation", () => {
  it("reports failures for invalid sample values", () => {
    const field = createFieldRuleSet("email", "string", "Email");
    field.rules = [createRule("required"), createRule("email")];

    const result = previewValidation([field], { email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.message).toMatch(/valid email/i);
  });

  it("passes when sample values satisfy rules", () => {
    const field = createFieldRuleSet("email", "string", "Email");
    field.rules = [createRule("required"), createRule("email")];

    const result = previewValidation([field], { email: "dev@dongle.app" });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe("zod export / import", () => {
  it("exports a Zod schema string", () => {
    const doc = createEmptyDocument("Contact");
    const email = createFieldRuleSet("email", "string", "Email");
    email.rules = [createRule("required"), createRule("email")];
    const age = createFieldRuleSet("age", "number", "Age");
    age.rules = [
      createRule("required"),
      createRule("min", { value: 18 }),
      createRule("integer"),
    ];
    doc.fields = [email, age];

    const { code, json } = exportToZodSchema(doc);
    expect(code).toContain('import { z } from "zod"');
    expect(code).toContain('"email": z.string()');
    expect(code).toContain(".email()");
    expect(code).toContain('"age": z.number()');
    expect(json.name).toBe("Contact");
  });

  it("round-trips JSON documents", () => {
    const doc = createEmptyDocument("Roundtrip");
    doc.fields = [createFieldRuleSet("name", "string", "Name")];
    const restored = importDocumentJson(exportDocumentJson(doc));
    expect(restored.fields[0]?.fieldName).toBe("name");
    expect(restored.version).toBe(1);
  });

  it("imports an existing Zod schema without requiring code edits", () => {
    const source = `
      import { z } from "zod";
      export const schema = z.object({
        /** Website */
        website: z.string().url().optional(),
        score: z.number().min(0).max(100).int(),
      });
    `;
    const doc = importFromZodSchema(source, "Imported");
    expect(doc.fields.map((f) => f.fieldName)).toEqual(["website", "score"]);
    expect(doc.fields[0]?.valueType).toBe("string");
    expect(doc.fields[0]?.rules.some((r) => r.operator === "url")).toBe(true);
    expect(doc.fields[1]?.valueType).toBe("number");
    expect(doc.fields[1]?.rules.some((r) => r.operator === "required")).toBe(true);
  });
});
