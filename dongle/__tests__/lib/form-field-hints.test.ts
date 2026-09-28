import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/messages/en";
import { es } from "@/lib/i18n/messages/es";
import { pt } from "@/lib/i18n/messages/pt";
import { setLocale, t } from "@/lib/i18n";

const HINT_KEYS = [
  "name",
  "category",
  "tags",
  "description",
  "websiteUrl",
  "githubUrl",
  "logoUrl",
  "docsUrl",
  "auditReportUrl",
  "bugBountyUrl",
  "contractAddresses",
] as const;

describe("form field hints i18n", () => {
  it("defines the same hint keys in en, es, and pt", () => {
    for (const key of HINT_KEYS) {
      expect(typeof en.projectForm.hints[key]).toBe("string");
      expect(en.projectForm.hints[key].length).toBeGreaterThan(10);
      expect(typeof es.projectForm.hints[key]).toBe("string");
      expect(typeof pt.projectForm.hints[key]).toBe("string");
    }
  });

  it("returns localized hints and updates when locale changes", () => {
    setLocale("en");
    const enHint = t("projectForm.hints.githubUrl");
    expect(enHint).toMatch(/GitHub/i);

    setLocale("es");
    const esHint = t("projectForm.hints.githubUrl");
    expect(esHint).toMatch(/GitHub/i);
    expect(esHint).not.toBe(enHint);

    setLocale("pt");
    const ptHint = t("projectForm.hints.githubUrl");
    expect(ptHint).toMatch(/GitHub/i);
    expect(ptHint).not.toBe(enHint);

    setLocale("en");
  });
});
