/**
 * Form-level right-to-left layout helpers (Issue #546).
 *
 * Built on the app-wide RTL helpers in `@/lib/i18n/rtl` so direction,
 * icon mirroring and the Tailwind `rtl:` variant stay consistent everywhere.
 */

import {
  getDirection,
  mirrorIconClass,
  shouldMirrorIcon,
  type TextDirection,
} from "@/lib/i18n/rtl";

export type FormTextDirection = TextDirection;

export interface FormRtlOptions {
  /** Explicit direction override. */
  dir?: FormTextDirection;
  /** Locale used when `dir` is omitted. */
  locale?: string | null;
}

/** Resolve the text direction for a form surface. */
export function resolveFormDirection(options: FormRtlOptions = {}): FormTextDirection {
  if (options.dir) return options.dir;
  return getDirection(options.locale);
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

export { shouldMirrorIcon, mirrorIconClass };
export { isRtlLocale, getDocumentDirection } from "@/lib/i18n/rtl";
