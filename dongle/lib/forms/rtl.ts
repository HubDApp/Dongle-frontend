/**
 * Form-level right-to-left layout helpers (Issue #546).
 */

import { getDocumentDirection, isRtlLocale } from "@/lib/i18n/locales";

export type FormTextDirection = "ltr" | "rtl";

export interface FormRtlOptions {
  /** Explicit direction override. */
  dir?: FormTextDirection;
  /** Locale used when `dir` is omitted. */
  locale?: string | null;
}

/** Resolve the text direction for a form surface. */
export function resolveFormDirection(options: FormRtlOptions = {}): FormTextDirection {
  if (options.dir) return options.dir;
  if (options.locale) return getDocumentDirection(options.locale);
  if (typeof document !== "undefined") {
    const htmlDir = document.documentElement.getAttribute("dir");
    if (htmlDir === "rtl" || htmlDir === "ltr") return htmlDir;
  }
  return "ltr";
}

export function isFormRtl(options: FormRtlOptions = {}): boolean {
  return resolveFormDirection(options) === "rtl";
}

/**
 * Logical CSS class helpers so forms flip correctly under RTL
 * without hard-coding left/right.
 */
export function formRtlClasses(dir: FormTextDirection): {
  root: string;
  labelRow: string;
  iconStart: string;
  iconEnd: string;
  alignStart: string;
  alignEnd: string;
} {
  const rtl = dir === "rtl";
  return {
    root: rtl ? "direction-rtl text-right" : "direction-ltr text-left",
    labelRow: "flex justify-between items-end gap-2",
    iconStart: rtl ? "ms-0 me-2" : "me-0 ms-0",
    iconEnd: rtl ? "me-0 ms-2" : "ms-0 me-2",
    alignStart: rtl ? "text-right" : "text-left",
    alignEnd: rtl ? "text-left" : "text-right",
  };
}

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
  dir: FormTextDirection,
): boolean {
  if (dir !== "rtl" || !name) return false;
  return MIRROR_ICON_NAMES.has(name.toLowerCase());
}

export function mirrorIconClass(
  name: string | undefined | null,
  dir: FormTextDirection,
): string {
  return shouldMirrorIcon(name, dir) ? "rtl:-scale-x-100" : "";
}

/** Inline style bag for a form root element. */
export function formDirectionProps(options: FormRtlOptions = {}): {
  dir: FormTextDirection;
  lang?: string;
  "data-form-dir": FormTextDirection;
} {
  const dir = resolveFormDirection(options);
  return {
    dir,
    lang: options.locale || undefined,
    "data-form-dir": dir,
  };
}

export { isRtlLocale, getDocumentDirection };
