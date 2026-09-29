/**
 * Form field accessibility audit tool (Issue #526)
 *
 * Checks ARIA labels, color contrast, keyboard navigation, focus management,
 * and reports issues with severity and suggested fixes.
 *
 * Designed to run in the browser against a live form container element.
 * Can also be consumed by tests via the `auditFormNode` function.
 */

export type A11yIssueSeverity = "error" | "warning" | "info";

export type A11yCheckCategory =
  | "aria-labels"
  | "color-contrast"
  | "keyboard-navigation"
  | "focus-management";

export interface A11yIssue {
  /** Which a11y rule fired. */
  ruleId: string;
  category: A11yCheckCategory;
  severity: A11yIssueSeverity;
  /** Human-readable description of the problem. */
  message: string;
  /** Suggested remediation. */
  suggestion: string;
  /** CSS selector or element description for locating the element. */
  element?: string;
}

export interface A11yAuditResult {
  passed: boolean;
  /** Total errors (severity === "error"). */
  errorCount: number;
  /** Total warnings (severity === "warning"). */
  warningCount: number;
  issues: A11yIssue[];
  /** ISO timestamp of when the audit ran. */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const name = el.getAttribute("name") ? `[name="${el.getAttribute("name")}"]` : "";
  const type = el.getAttribute("type") ? `[type="${el.getAttribute("type")}"]` : "";
  return `${tag}${id}${name}${type}`;
}

/**
 * Retrieve all interactive form controls inside a container.
 */
function getFormControls(container: Element): Element[] {
  return Array.from(
    container.querySelectorAll<Element>(
      "input, textarea, select, button, [role='combobox'], [role='listbox'], [role='radio'], [role='checkbox']",
    ),
  );
}

// ---------------------------------------------------------------------------
// Check: ARIA labels
// ---------------------------------------------------------------------------

function checkAriaLabels(container: Element, issues: A11yIssue[]): void {
  const controls = getFormControls(container);

  for (const el of controls) {
    const tag = el.tagName.toLowerCase();

    // Buttons only need accessible text
    if (tag === "button") {
      const hasText =
        el.textContent?.trim() ||
        el.getAttribute("aria-label") ||
        el.getAttribute("aria-labelledby");
      if (!hasText) {
        issues.push({
          ruleId: "button-name",
          category: "aria-labels",
          severity: "error",
          message: "Button has no accessible name.",
          suggestion:
            "Add visible text content, an aria-label, or aria-labelledby attribute.",
          element: describeElement(el),
        });
      }
      continue;
    }

    // Inputs, textareas, selects
    const id = el.id;
    const ariaLabel = el.getAttribute("aria-label");
    const ariaLabelledBy = el.getAttribute("aria-labelledby");
    const hasLabel =
      (id && container.querySelector(`label[for="${id}"]`)) ||
      el.closest("label") ||
      ariaLabel ||
      ariaLabelledBy;

    if (!hasLabel) {
      issues.push({
        ruleId: "label-missing",
        category: "aria-labels",
        severity: "error",
        message: `Form control is missing an accessible label.`,
        suggestion:
          "Associate a <label> via the `for` attribute, wrap the control in a <label>, or add an aria-label/aria-labelledby.",
        element: describeElement(el),
      });
    }

    // aria-required should be consistent with visual required markers
    const isRequired =
      el.getAttribute("required") !== null ||
      el.getAttribute("aria-required") === "true";
    const labelEl = id
      ? container.querySelector(`label[for="${id}"]`)
      : el.closest("label");
    const labelText = labelEl?.textContent ?? "";
    const hasVisualRequired =
      labelText.includes("*") || labelText.includes("required");

    if (isRequired && !hasVisualRequired && !el.getAttribute("aria-required")) {
      issues.push({
        ruleId: "aria-required-missing",
        category: "aria-labels",
        severity: "warning",
        message: "Required field lacks aria-required='true'.",
        suggestion:
          "Add aria-required='true' to required controls so screen readers announce the requirement.",
        element: describeElement(el),
      });
    }

    // Check that aria-describedby targets exist
    const describedBy = el.getAttribute("aria-describedby");
    if (describedBy) {
      for (const targetId of describedBy.split(/\s+/)) {
        if (targetId && !document.getElementById(targetId)) {
          issues.push({
            ruleId: "aria-describedby-target-missing",
            category: "aria-labels",
            severity: "warning",
            message: `aria-describedby references non-existent id "${targetId}".`,
            suggestion: `Ensure an element with id="${targetId}" exists in the DOM.`,
            element: describeElement(el),
          });
        }
      }
    }

    // Fieldsets wrapping radio groups should have a legend
    const fieldset = el.closest("fieldset");
    if (fieldset && !fieldset.querySelector("legend")) {
      issues.push({
        ruleId: "fieldset-legend-missing",
        category: "aria-labels",
        severity: "warning",
        message: "A <fieldset> is missing a <legend>.",
        suggestion:
          "Add a <legend> to describe the group of related controls inside the fieldset.",
        element: "fieldset",
      });
    }
  }

  // Check that error messages reference controls via aria-describedby
  const alertEls = container.querySelectorAll('[role="alert"]');
  for (const alert of alertEls) {
    const alertId = alert.id;
    if (!alertId) {
      issues.push({
        ruleId: "alert-no-id",
        category: "aria-labels",
        severity: "warning",
        message: "An error/alert element has no id.",
        suggestion:
          "Give error messages an id so they can be referenced by aria-describedby on the related control.",
        element: describeElement(alert),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Check: Color contrast (heuristic — checks inline styles & known class patterns)
// ---------------------------------------------------------------------------

/**
 * Relative luminance of an sRGB color (0–1).
 * Input values in 0–255 range.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const srgb = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Parse a CSS rgb/rgba string → [r, g, b] | null. */
function parseRgb(cssColor: string): [number, number, number] | null {
  const m = cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

function checkColorContrast(container: Element, issues: A11yIssue[]): void {
  // Only check text-bearing label and help-text elements
  const textEls = container.querySelectorAll<HTMLElement>(
    "label, p, span, legend, h1, h2, h3, h4",
  );

  for (const el of textEls) {
    if (!el.textContent?.trim()) continue;

    const style = window.getComputedStyle(el);
    const fgRgb = parseRgb(style.color);
    const bgRgb = parseRgb(style.backgroundColor);

    if (!fgRgb || !bgRgb) continue;

    // Skip transparent backgrounds (check parent)
    const [br, bg, bb] = bgRgb;
    if (br === 0 && bg === 0 && bb === 0 && style.backgroundColor.includes("0)")) continue;

    const fgL = relativeLuminance(...fgRgb);
    const bgL = relativeLuminance(...bgRgb);
    const ratio = contrastRatio(fgL, bgL);

    const fontSize = parseFloat(style.fontSize);
    const fontWeight = style.fontWeight;
    const isLargeText =
      fontSize >= 18 || (fontSize >= 14 && (fontWeight === "bold" || parseInt(fontWeight) >= 700));

    // WCAG 2.1 AA thresholds
    const minRatio = isLargeText ? 3.0 : 4.5;

    if (ratio < minRatio) {
      issues.push({
        ruleId: "color-contrast",
        category: "color-contrast",
        severity: "error",
        message: `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA minimum of ${minRatio}:1.`,
        suggestion: isLargeText
          ? "Ensure large text (≥18px or ≥14px bold) has at least 3:1 contrast."
          : "Ensure normal text has at least 4.5:1 contrast between foreground and background.",
        element: describeElement(el),
      });
    }
  }

  // Heuristic: flag placeholder text which is commonly low contrast
  const inputs = container.querySelectorAll<HTMLElement>("input, textarea");
  for (const input of inputs) {
    const classes = input.className;
    if (
      classes.includes("placeholder-zinc-300") ||
      classes.includes("placeholder-gray-300") ||
      classes.includes("placeholder-slate-300")
    ) {
      issues.push({
        ruleId: "placeholder-contrast",
        category: "color-contrast",
        severity: "warning",
        message: "Placeholder text may have insufficient contrast.",
        suggestion:
          "Use a placeholder colour with at least 4.5:1 contrast ratio (e.g. zinc-500 instead of zinc-300).",
        element: describeElement(input),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Check: Keyboard navigation
// ---------------------------------------------------------------------------

function checkKeyboardNavigation(container: Element, issues: A11yIssue[]): void {
  const controls = getFormControls(container);

  for (const el of controls) {
    const tabindex = el.getAttribute("tabindex");

    // Negative tabindex removes element from tab order without a good reason
    if (tabindex !== null && parseInt(tabindex) < 0) {
      issues.push({
        ruleId: "negative-tabindex",
        category: "keyboard-navigation",
        severity: "warning",
        message: "Element has tabindex < 0, removing it from the default Tab order.",
        suggestion:
          "Only use tabindex='-1' for elements that are intentionally excluded (e.g. programmatic focus targets). Ensure keyboard users can still reach this control.",
        element: describeElement(el),
      });
    }

    // Positive tabindex disrupts the natural DOM order
    if (tabindex !== null && parseInt(tabindex) > 0) {
      issues.push({
        ruleId: "positive-tabindex",
        category: "keyboard-navigation",
        severity: "warning",
        message: `tabindex="${tabindex}" creates an explicit tab order that may be confusing.`,
        suggestion:
          "Prefer tabindex='0' (or remove the attribute) and reorder elements in the DOM instead.",
        element: describeElement(el),
      });
    }
  }

  // Select elements should rely on native arrow-key behaviour; warn if custom
  // role='listbox' is used without keyboard handler evidence
  const customSelects = container.querySelectorAll('[role="listbox"]');
  for (const sel of customSelects) {
    if (!sel.getAttribute("onkeydown") && !sel.getAttribute("data-keyboard")) {
      issues.push({
        ruleId: "custom-select-keyboard",
        category: "keyboard-navigation",
        severity: "warning",
        message: "Custom listbox may not support arrow-key navigation.",
        suggestion:
          "Implement keydown handlers for ArrowUp/ArrowDown, Home, End, Enter, and Escape per the ARIA authoring practices.",
        element: describeElement(sel),
      });
    }
  }

  // Forms should have a submit button reachable by Enter
  const submitBtn = container.querySelector<Element>(
    'button[type="submit"], input[type="submit"]',
  );
  if (!submitBtn) {
    issues.push({
      ruleId: "no-submit-button",
      category: "keyboard-navigation",
      severity: "warning",
      message: "No submit button found — keyboard users cannot submit with Enter.",
      suggestion:
        "Add a <button type='submit'> inside the form so pressing Enter on any text field triggers submission.",
    });
  }
}

// ---------------------------------------------------------------------------
// Check: Focus management
// ---------------------------------------------------------------------------

function checkFocusManagement(container: Element, issues: A11yIssue[]): void {
  // All interactive elements should have a visible focus indicator
  const interactive = container.querySelectorAll<HTMLElement>(
    "input, textarea, select, button, a[href]",
  );

  for (const el of interactive) {
    const style = window.getComputedStyle(el, ":focus");
    const outline = style.outlineStyle;
    const outlineWidth = parseFloat(style.outlineWidth);
    const boxShadow = style.boxShadow;

    const hasVisibleFocus =
      (outline !== "none" && outlineWidth > 0) ||
      (boxShadow && boxShadow !== "none");

    if (!hasVisibleFocus) {
      issues.push({
        ruleId: "focus-visible-missing",
        category: "focus-management",
        severity: "error",
        message: "Element has no visible focus indicator.",
        suggestion:
          "Apply a CSS :focus-visible style with outline or box-shadow. Do not use `outline: none` without a custom focus replacement.",
        element: describeElement(el),
      });
    }
  }

  // Check for modal/dialog elements — they should contain a focus trap
  const dialogs = container.querySelectorAll<Element>(
    '[role="dialog"], [role="alertdialog"]',
  );
  for (const dialog of dialogs) {
    const hasFocusable = dialog.querySelector(
      "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
    );
    if (!hasFocusable) {
      issues.push({
        ruleId: "dialog-no-focusable",
        category: "focus-management",
        severity: "error",
        message: "Dialog has no focusable element for focus trapping.",
        suggestion:
          "Ensure every dialog/modal contains at least one focusable element (e.g. a close button) so focus can be trapped inside.",
        element: describeElement(dialog),
      });
    }

    // Dialog should expose an accessible name
    const dialogName =
      dialog.getAttribute("aria-label") ||
      dialog.getAttribute("aria-labelledby");
    if (!dialogName) {
      issues.push({
        ruleId: "dialog-no-name",
        category: "focus-management",
        severity: "warning",
        message: "Dialog is missing an accessible name.",
        suggestion:
          "Add aria-labelledby pointing to a heading inside the dialog, or an aria-label attribute.",
        element: describeElement(dialog),
      });
    }
  }

  // Warn about `autofocus` misuse — it should only be used on the first field
  const autofocused = container.querySelectorAll("[autofocus]");
  if (autofocused.length > 1) {
    issues.push({
      ruleId: "multiple-autofocus",
      category: "focus-management",
      severity: "warning",
      message: `${autofocused.length} elements have the autofocus attribute.`,
      suggestion:
        "Only one element should have autofocus. Extra autofocus attributes are ignored by browsers and indicate a structural issue.",
    });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Audit a form container element for accessibility issues.
 *
 * @param container - The HTMLElement wrapping the form (or the <form> itself).
 * @returns An A11yAuditResult with all issues found.
 *
 * @example
 * ```ts
 * const formEl = document.querySelector('form');
 * if (formEl) {
 *   const result = auditFormNode(formEl);
 *   console.log(result);
 * }
 * ```
 */
export function auditFormNode(container: Element): A11yAuditResult {
  const issues: A11yIssue[] = [];

  checkAriaLabels(container, issues);
  checkColorContrast(container, issues);
  checkKeyboardNavigation(container, issues);
  checkFocusManagement(container, issues);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    passed: errorCount === 0,
    errorCount,
    warningCount,
    issues,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format an A11yAuditResult as a human-readable text report.
 */
export function formatAuditReport(result: A11yAuditResult): string {
  const lines: string[] = [
    `=== Form Accessibility Audit ===`,
    `Timestamp : ${result.timestamp}`,
    `Status    : ${result.passed ? "PASS" : "FAIL"}`,
    `Errors    : ${result.errorCount}`,
    `Warnings  : ${result.warningCount}`,
    "",
  ];

  if (result.issues.length === 0) {
    lines.push("No issues found.");
    return lines.join("\n");
  }

  const byCategory = new Map<A11yCheckCategory, A11yIssue[]>();
  for (const issue of result.issues) {
    const list = byCategory.get(issue.category) ?? [];
    list.push(issue);
    byCategory.set(issue.category, list);
  }

  for (const [category, categoryIssues] of byCategory) {
    lines.push(`--- ${category} ---`);
    for (const issue of categoryIssues) {
      lines.push(
        `[${issue.severity.toUpperCase()}] ${issue.ruleId}` +
          (issue.element ? ` (${issue.element})` : ""),
      );
      lines.push(`  ${issue.message}`);
      lines.push(`  Fix: ${issue.suggestion}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
