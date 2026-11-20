/**
 * App-wide right-to-left (RTL) helpers.
 *
 * Arabic (`ar`) and Hebrew (`he`) render right-to-left. Direction is derived
 * from the active locale, or from the document `<html dir>` when no locale is
 * supplied.
 *
 * In components prefer Tailwind's `rtl:` / `ltr:` variants and logical spacing
 * utilities (`ps-*`, `pe-*`, `ms-*`, `me-*`) so the layout mirrors without
 * hard-coding `left` / `right`. These helpers cover the cases that need a
 * JavaScript decision (icon mirroring, direction-aware values).
 */

import { getDocumentDirection, isRtlLocale } from "./locales";

export type TextDirection = "ltr" | "rtl";

/** Root classes applied when the surface renders right-to-left. */
export const RTL_ROOT_CLASS = "direction-rtl text-right";
export const LTR_ROOT_CLASS = "direction-ltr text-left";

/**
 * Resolve the active text direction. Falls back to the document direction,
 * then to `ltr`.
 */
export function getDirection(locale?: string | null): TextDirection {
  if (locale) return getDocumentDirection(locale);

  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("dir");
    if (attr === "rtl" || attr === "ltr") return attr;
  }

  return "ltr";
}

export function isRtl(locale?: string | null): boolean {
  return getDirection(locale) === "rtl";
}

/** Pick a value based on the current direction. */
export function rtlValue<T>(ltr: T, rtl: T, locale?: string | null): T {
  return isRtl(locale) ? rtl : ltr;
}

export interface RtlClassSet {
  root: string;
  alignStart: string;
  alignEnd: string;
  iconFlip: string;
}

/**
 * Logical layout classes. `alignStart` is the "natural" reading edge
 * (right in RTL), `alignEnd` the opposite edge.
 */
export function rtlClasses(dir: TextDirection): RtlClassSet {
  const rtl = dir === "rtl";
  return {
    root: rtl ? RTL_ROOT_CLASS : LTR_ROOT_CLASS,
    alignStart: rtl ? "text-right" : "text-left",
    alignEnd: rtl ? "text-left" : "text-right",
    iconFlip: rtl ? "rtl:-scale-x-100" : "",
  };
}

/**
 * Logical spacing utilities. These map to `padding-inline-*` / `margin-inline-*`,
 * so `padding-left` visually becomes `padding-right` under `dir="rtl"` — no
 * `rtl:` override needed.
 */
export const logicalSpacing = {
  paddingInlineStart: "ps-3",
  paddingInlineEnd: "pe-3",
  marginInlineStart: "ms-2",
  marginInlineEnd: "me-2",
} as const;

/**
 * Icons that convey direction (chevrons, arrows) should be mirrored in RTL.
 * Decorative / symmetric icons should not.
 */
const MIRROR_ICON_NAMES = new Set([
  "chevron-left",
  "chevron-right",
  "arrow-left",
  "arrow-right",
  "caret-left",
  "caret-right",
  "corner-down-left",
  "corner-down-right",
  "reply",
  "forward",
  "log-out",
  "log-in",
  "external-link",
]);

export function shouldMirrorIcon(
  name: string | undefined | null,
  dir: TextDirection,
): boolean {
  if (dir !== "rtl" || !name) return false;
  return MIRROR_ICON_NAMES.has(name.toLowerCase());
}

/**
 * Tailwind classes that mirror a directional icon. Uses the built-in
 * `rtl:` variant so the flip only applies when the document is RTL.
 */
export function mirrorIconClass(
  name: string | undefined | null,
  dir: TextDirection,
): string {
  return shouldMirrorIcon(name, dir) ? "rtl:-scale-x-100" : "";
}

export { isRtlLocale, getDocumentDirection };
