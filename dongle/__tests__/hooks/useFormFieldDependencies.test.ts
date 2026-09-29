import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useFormFieldDependencies,
  ConditionBuilder,
  type FieldDependencyMap,
} from "@/hooks/useFormFieldDependencies";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHook(
  deps: FieldDependencyMap,
  values: Record<string, unknown>,
) {
  return renderHook(
    (props: { formValues: Record<string, unknown> }) =>
      useFormFieldDependencies({
        formValues: props.formValues,
        dependencies: deps,
      }),
    { initialProps: { formValues: values } },
  );
}

// ---------------------------------------------------------------------------
// Basic show / hide
// ---------------------------------------------------------------------------

describe("useFormFieldDependencies – basic visibility", () => {
  const deps: FieldDependencyMap = {
    auditReportUrl: ConditionBuilder.when("primaryCategory").equals("defi"),
  };

  it("shows the field when the condition is met", () => {
    const { result } = makeHook(deps, { primaryCategory: "defi" });
    expect(result.current.isVisible("auditReportUrl")).toBe(true);
  });

  it("hides the field when the condition is not met", () => {
    const { result } = makeHook(deps, { primaryCategory: "gaming" });
    expect(result.current.isVisible("auditReportUrl")).toBe(false);
  });

  it("treats fields without a registered dependency as always visible", () => {
    const { result } = makeHook(deps, { primaryCategory: "gaming" });
    expect(result.current.isVisible("websiteUrl")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Field becomes visible / hidden after dependency changes
// ---------------------------------------------------------------------------

describe("useFormFieldDependencies – reactive visibility", () => {
  const deps: FieldDependencyMap = {
    logoUrl: ConditionBuilder.when("primaryCategory").equals("gaming"),
  };

  it("field becomes visible when dependency changes to matching value", () => {
    const { result, rerender } = makeHook(deps, { primaryCategory: "defi" });
    expect(result.current.isVisible("logoUrl")).toBe(false);

    rerender({ formValues: { primaryCategory: "gaming" } });
    expect(result.current.isVisible("logoUrl")).toBe(true);
  });

  it("field becomes hidden when dependency changes away from matching value", () => {
    const { result, rerender } = makeHook(deps, { primaryCategory: "gaming" });
    expect(result.current.isVisible("logoUrl")).toBe(true);

    rerender({ formValues: { primaryCategory: "defi" } });
    expect(result.current.isVisible("logoUrl")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Submission payload – hidden field exclusion
// ---------------------------------------------------------------------------

describe("useFormFieldDependencies – visibleValues excludes hidden fields", () => {
  const deps: FieldDependencyMap = {
    auditReportUrl: ConditionBuilder.when("primaryCategory").equals("defi"),
    logoUrl: ConditionBuilder.when("primaryCategory").equals("gaming"),
  };

  it("omits hidden fields from visibleValues", () => {
    const values = {
      name: "My Project",
      primaryCategory: "defi",
      auditReportUrl: "https://audit.example.com",
      logoUrl: "https://logo.example.com",
    };
    const { result } = makeHook(deps, values);

    expect(result.current.isVisible("auditReportUrl")).toBe(true);
    expect(result.current.isVisible("logoUrl")).toBe(false);

    expect(result.current.visibleValues).toHaveProperty("auditReportUrl");
    expect(result.current.visibleValues).not.toHaveProperty("logoUrl");
    expect(result.current.visibleValues.name).toBe("My Project");
  });

  it("includes all fields when all conditions are met", () => {
    const deps2: FieldDependencyMap = {
      auditReportUrl: ConditionBuilder.when("primaryCategory").isNotEmpty(),
    };
    const { result } = makeHook(deps2, {
      name: "P",
      primaryCategory: "defi",
      auditReportUrl: "https://audit.example.com",
    });
    expect(result.current.visibleValues).toHaveProperty("auditReportUrl");
  });

  it("omits nothing when there are no conditions registered", () => {
    const { result } = makeHook({}, { name: "P", url: "https://x.com" });
    expect(result.current.visibleValues).toEqual({ name: "P", url: "https://x.com" });
  });
});

// ---------------------------------------------------------------------------
// Nested field dependencies
// ---------------------------------------------------------------------------

describe("useFormFieldDependencies – nested field paths", () => {
  const deps: FieldDependencyMap = {
    "details.auditUrl": ConditionBuilder.when("details.hasAudit").equals(true),
  };

  it("shows nested field when nested dependency is met", () => {
    const { result } = makeHook(deps, {
      details: { hasAudit: true, auditUrl: "https://audit.example.com" },
    });
    expect(result.current.isVisible("details.auditUrl")).toBe(true);
  });

  it("hides nested field when nested dependency is not met", () => {
    const { result } = makeHook(deps, {
      details: { hasAudit: false, auditUrl: "https://audit.example.com" },
    });
    expect(result.current.isVisible("details.auditUrl")).toBe(false);
  });

  it("omits the nested field from visibleValues when hidden", () => {
    const { result } = makeHook(deps, {
      details: { hasAudit: false, auditUrl: "https://audit.example.com" },
    });
    const nested = result.current.visibleValues.details as
      | Record<string, unknown>
      | undefined;
    expect(nested).toBeDefined();
    // auditUrl should be removed from the nested object
    expect(nested).not.toHaveProperty("auditUrl");
  });
});

// ---------------------------------------------------------------------------
// Multiple conditions (AND / OR)
// ---------------------------------------------------------------------------

describe("useFormFieldDependencies – multiple conditions", () => {
  it("AND condition: only visible when both sub-conditions are true", () => {
    const deps: FieldDependencyMap = {
      bugBountyUrl: ConditionBuilder.and(
        ConditionBuilder.when("primaryCategory").equals("defi"),
        ConditionBuilder.when("auditReportUrl").isNotEmpty(),
      ),
    };

    const { result, rerender } = makeHook(deps, {
      primaryCategory: "defi",
      auditReportUrl: "",
    });
    expect(result.current.isVisible("bugBountyUrl")).toBe(false);

    rerender({
      formValues: {
        primaryCategory: "defi",
        auditReportUrl: "https://audit.example.com",
      },
    });
    expect(result.current.isVisible("bugBountyUrl")).toBe(true);
  });

  it("OR condition: visible when either sub-condition is true", () => {
    const deps: FieldDependencyMap = {
      githubUrl: ConditionBuilder.or(
        ConditionBuilder.when("primaryCategory").equals("defi"),
        ConditionBuilder.when("primaryCategory").equals("payments"),
      ),
    };

    const { result, rerender } = makeHook(deps, { primaryCategory: "defi" });
    expect(result.current.isVisible("githubUrl")).toBe(true);

    rerender({ formValues: { primaryCategory: "gaming" } });
    expect(result.current.isVisible("githubUrl")).toBe(false);
  });

  it("multiple dependent fields controlled by the same source", () => {
    const deps: FieldDependencyMap = {
      auditReportUrl: ConditionBuilder.when("primaryCategory").equals("defi"),
      docsUrl: ConditionBuilder.when("primaryCategory").in(["defi", "payments"]),
    };

    const { result } = makeHook(deps, { primaryCategory: "payments" });
    expect(result.current.isVisible("auditReportUrl")).toBe(false);
    expect(result.current.isVisible("docsUrl")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Resetting the controlling field
// ---------------------------------------------------------------------------

describe("useFormFieldDependencies – resetting controlling field", () => {
  it("shows hidden field again when controlling field is reset to matching value", () => {
    const deps: FieldDependencyMap = {
      auditReportUrl: ConditionBuilder.when("primaryCategory").equals("defi"),
    };

    const { result, rerender } = makeHook(deps, { primaryCategory: "gaming" });
    expect(result.current.isVisible("auditReportUrl")).toBe(false);

    rerender({ formValues: { primaryCategory: "defi" } });
    expect(result.current.isVisible("auditReportUrl")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Complex dependency chain (A → B → C)
// ---------------------------------------------------------------------------

describe("useFormFieldDependencies – complex dependency chain", () => {
  it("handles chain A controls B which controls C", () => {
    // A = primaryCategory, B = auditReportUrl, C = bugBountyUrl
    const deps: FieldDependencyMap = {
      auditReportUrl: ConditionBuilder.when("primaryCategory").equals("defi"),
      bugBountyUrl: ConditionBuilder.and(
        ConditionBuilder.when("primaryCategory").equals("defi"),
        ConditionBuilder.when("auditReportUrl").isNotEmpty(),
      ),
    };

    const { result, rerender } = makeHook(deps, {
      primaryCategory: "gaming",
      auditReportUrl: "https://audit.example.com",
    });

    expect(result.current.isVisible("auditReportUrl")).toBe(false);
    expect(result.current.isVisible("bugBountyUrl")).toBe(false);

    // Switch to defi but leave audit empty
    rerender({
      formValues: { primaryCategory: "defi", auditReportUrl: "" },
    });
    expect(result.current.isVisible("auditReportUrl")).toBe(true);
    expect(result.current.isVisible("bugBountyUrl")).toBe(false);

    // Now fill in audit
    rerender({
      formValues: {
        primaryCategory: "defi",
        auditReportUrl: "https://audit.example.com",
      },
    });
    expect(result.current.isVisible("auditReportUrl")).toBe(true);
    expect(result.current.isVisible("bugBountyUrl")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// visibleValues does not mutate original formValues
// ---------------------------------------------------------------------------

describe("useFormFieldDependencies – immutability", () => {
  it("does not mutate the original formValues object", () => {
    const deps: FieldDependencyMap = {
      auditReportUrl: ConditionBuilder.when("primaryCategory").equals("defi"),
    };
    const original = {
      primaryCategory: "gaming",
      auditReportUrl: "https://audit.example.com",
    };
    const snapshot = { ...original };

    makeHook(deps, original);
    expect(original).toEqual(snapshot);
  });
});
