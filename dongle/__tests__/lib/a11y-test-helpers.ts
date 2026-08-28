import { type ReactElement } from "react";
import { render } from "@testing-library/react";
import {
  axe,
  type AxeResults,
  type RuleObject,
  type RunOptions,
} from "vitest-axe";

export const DEFAULT_A11Y_OPTIONS: RunOptions = {
  runOnly: {
    type: "tag",
    values: [
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
      "best-practice",
    ],
  },
  rules: {
    "color-contrast": { enabled: true },
    "duplicate-id": { enabled: true },
    "aria-allowed-attr": { enabled: true },
    "aria-hidden-focus": { enabled: true },
    "aria-input-field-name": { enabled: true },
    "aria-required-attr": { enabled: true },
    "aria-required-children": { enabled: true },
    "aria-required-parent": { enabled: true },
    "aria-roles": { enabled: true },
    "aria-toggle-field-name": { enabled: true },
    "button-name": { enabled: true },
    "checkbox-contrast": { enabled: true },
    "color-contrast-enhanced": { enabled: false },
    "dialog-name": { enabled: true },
    "dlitem": { enabled: true },
    "duplicate-id-active": { enabled: true },
    "duplicate-id-aria": { enabled: true },
    "empty-heading": { enabled: true },
    "form-field-multiple-labels": { enabled: true },
    "frame-title": { enabled: true },
    "heading-order": { enabled: true },
    "hidden-content": { enabled: true },
    "html-has-lang": { enabled: true },
    "image-alt": { enabled: true },
    "input-button-name": { enabled: true },
    "input-image-alt": { enabled: true },
    "label": { enabled: true },
    "landmark-one-main": { enabled: true },
    "link-name": { enabled: true },
    "list": { enabled: true },
    "listitem": { enabled: true },
    "marquee": { enabled: true },
    "meta-viewport": { enabled: true },
    "nested-interactive": { enabled: true },
    "no-autoplay-audio": { enabled: true },
    "object-alt": { enabled: true },
    "p-as-heading": { enabled: false },
    "page-has-heading-one": { enabled: true },
    "radiogroup": { enabled: true },
    "region": { enabled: false },
    "role-img-alt": { enabled: true },
    "scrollable-region-focusable": { enabled: true },
    "select-name": { enabled: true },
    "skip-link": { enabled: false },
    "tabindex": { enabled: true },
    "table-duplicate-name": { enabled: true },
    "td-has-header": { enabled: true },
    "th-has-data-cells": { enabled: true },
    "valid-lang": { enabled: true },
    "video-caption": { enabled: true },
  },
};

export interface A11yTestOptions {
  options?: RunOptions;
  skipRules?: string[];
  expectZeroViolations?: boolean;
}

export async function testA11y(
  ui: ReactElement,
  {
    options = DEFAULT_A11Y_OPTIONS,
    skipRules = [],
    expectZeroViolations = true,
  }: A11yTestOptions = {},
): Promise<AxeResults> {
  const effectiveOptions: RunOptions = {
    ...options,
    rules: {
      ...options?.rules,
      ...Object.fromEntries(skipRules.map((rule) => [rule, { enabled: false }])),
    },
  };

  const { container } = render(ui);
  const results = await axe(container, effectiveOptions);

  if (expectZeroViolations) {
    expect(results).toHaveNoViolations();
  }

  return results;
}

export function getViolationSummary(results: AxeResults): {
  total: number;
  byRule: Record<string, number>;
  details: string[];
} {
  const byRule: Record<string, number> = {};
  const details: string[] = [];

  for (const violation of results.violations) {
    byRule[violation.id] = (byRule[violation.id] ?? 0) + violation.nodes.length;
    for (const node of violation.nodes) {
      details.push(
        `[${violation.id}] ${violation.description} → ${
          Array.isArray(node.target) ? node.target.join(", ") : node.target
        }`,
      );
    }
  }

  return {
    total: results.violations.reduce(
      (sum, v) => sum + v.nodes.length,
      0,
    ),
    byRule,
    details,
  };
}

export function reportViolations(results: AxeResults): void {
  const summary = getViolationSummary(results);
  if (summary.total === 0) return;

  console.warn(
    `\n⚠️  Accessibility Violations Found: ${summary.total}\n` +
      `═══════════════════════════════════════════════\n` +
      Object.entries(summary.byRule)
        .map(([rule, count]) => `  • ${rule}: ${count} occurrence(s)`)
        .join("\n") +
      `\n═══════════════════════════════════════════════\n` +
      summary.details.map((d) => `  ${d}`).join("\n") +
      "\n",
  );
}

export interface ColorContrastPair {
  name: string;
  foreground: string;
  background: string;
  size?: "normal" | "large";
  minRatio?: number;
}

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
export const WCAG_AAA_NORMAL = 7;
export const WCAG_AAA_LARGE = 4.5;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(hexToRgb(color1));
  const l2 = relativeLuminance(hexToRgb(color2));
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

export function passesContrastAA(
  foreground: string,
  background: string,
  size: "normal" | "large" = "normal",
): { ratio: number; passes: boolean; required: number } {
  const ratio = contrastRatio(foreground, background);
  const required = size === "large" ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
  return { ratio, passes: ratio >= required, required };
}

export function assertContrastPairs(pairs: ColorContrastPair[]): void {
  for (const pair of pairs) {
    const size = pair.size ?? "normal";
    const min = pair.minRatio ?? (size === "large" ? WCAG_AA_LARGE : WCAG_AA_NORMAL);
    const ratio = contrastRatio(pair.foreground, pair.background);
    expect(
      ratio,
      `Color contrast for "${pair.name}" (${pair.foreground} on ${pair.background}, ${size} text) failed: ` +
        `expected ≥ ${min}:1, got ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(min);
  }
}

export function getAnnouncementsFromLiveRegion(
  container: HTMLElement,
  selector: string = '[aria-live="polite"], [aria-live="assertive"]',
): { element: Element; content: string; live: string }[] {
  const regions = Array.from(container.querySelectorAll(selector));
  return regions.map((element) => ({
    element,
    content: (element.textContent ?? "").trim(),
    live: element.getAttribute("aria-live") ?? "",
  }));
}

export function getAllFocusableElements(
  container: HTMLElement | Document,
): HTMLElement[] {
  const selectors = [
    "a[href]",
    "area[href]",
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'iframe:not([tabindex="-1"])',
    "[contenteditable]",
    '[tabindex]:not([tabindex="-1"])',
  ];
  return Array.from(container.querySelectorAll(selectors.join(", "))).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      getComputedStyle(el).visibility !== "hidden" &&
      getComputedStyle(el).display !== "none",
  );
}

export async function tabThroughSequence(
  elements: HTMLElement[],
  user: ReturnType<(typeof import("@testing-library/user-event"))["setup"]>,
): Promise<void> {
  for (const el of elements) {
    await user.tab();
    expect(document.activeElement).toBe(el);
  }
}
