import { describe, expect, it } from "vitest";
import {
  demoIntakeSchema,
  resolveFieldCopy,
  resolveFormTitle,
  resolveLocalizedText,
  schemaSupportsLocale,
  validatePath,
} from "@/services/form-builder";
import { setLocale } from "@/lib/i18n";

describe("form multi-language (#545)", () => {
  it("resolves labels and placeholders per locale with English fallback", () => {
    const field = demoIntakeSchema.fields.find((f) => f.id === "projectName")!;
    const en = resolveFieldCopy(field, "en");
    const es = resolveFieldCopy(field, "es");
    const pt = resolveFieldCopy(field, "pt");

    expect(en.label).toBe("Project name");
    expect(es.label).toBe("Nombre del proyecto");
    expect(pt.label).toBe("Nome do projeto");
    expect(es.placeholder).toBe("Mi app en Stellar");
    expect(resolveFormTitle(demoIntakeSchema, "es")).toBe("Registro de proyecto");
  });

  it("translates validation error messages", () => {
    const en = validatePath(
      demoIntakeSchema,
      { projectType: "dapp" },
      "en",
    );
    const es = validatePath(
      demoIntakeSchema,
      { projectType: "dapp" },
      "es",
    );

    const enRequired = en.errors.find((e) => e.fieldId === "projectName");
    const esRequired = es.errors.find((e) => e.fieldId === "projectName");
    expect(enRequired?.message).toBe("Project name is required");
    expect(esRequired?.message).toBe("El nombre del proyecto es obligatorio");
  });

  it("falls back to English when a locale string is missing", () => {
    expect(
      resolveLocalizedText({ en: "Hello", es: undefined }, "es"),
    ).toBe("Hello");
  });

  it("declares supported locales for the language toggle", () => {
    expect(schemaSupportsLocale(demoIntakeSchema, "en")).toBe(true);
    expect(schemaSupportsLocale(demoIntakeSchema, "es")).toBe(true);
    expect(schemaSupportsLocale(demoIntakeSchema, "pt")).toBe(true);
    setLocale("pt");
    expect(resolveFormTitle(demoIntakeSchema, "pt")).toContain("Cadastro");
    setLocale("en");
  });
});
