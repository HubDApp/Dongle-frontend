/**
 * App-wide RTL support tests.
 *
 * Verifies the direction/layout helpers in `lib/i18n/rtl.ts` and that number,
 * date and list formatting respect right-to-left locales (Arabic and Hebrew).
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  getDirection,
  isRtl,
  isRtlLocale,
  LTR_ROOT_CLASS,
  logicalSpacing,
  mirrorIconClass,
  RTL_ROOT_CLASS,
  rtlClasses,
  rtlValue,
  shouldMirrorIcon,
} from "@/lib/i18n/rtl";
import {
  formatDate,
  formatList,
  formatNumber,
  formatRelativeDate,
} from "@/lib/i18n/format";
import { setLocale } from "@/lib/i18n";

const ARABIC = /[\u0600-\u06FF]/;
const ARABIC_INDIC_DIGITS = /[\u0660-\u0669]/;
const HEBREW = /[\u0590-\u05FF]/;

afterEach(() => {
  setLocale("en");
  if (typeof document !== "undefined") {
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
  }
});

describe("direction resolution", () => {
  it("treats Arabic and Hebrew (including regional tags) as RTL", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("ar-EG")).toBe("rtl");
    expect(getDirection("he")).toBe("rtl");
    expect(getDirection("he-IL")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
    expect(getDirection("es")).toBe("ltr");
  });

  it("falls back to the document direction when no locale is given", () => {
    document.documentElement.dir = "rtl";
    expect(getDirection()).toBe("rtl");
    expect(isRtl()).toBe(true);
  });

  it("exposes isRtlLocale and rtlValue helpers", () => {
    expect(isRtlLocale("he")).toBe(true);
    expect(isRtlLocale("fr")).toBe(false);
    expect(rtlValue("left", "right", "ar")).toBe("right");
    expect(rtlValue("left", "right", "en")).toBe("left");
  });
});

describe("layout classes", () => {
  it("mirrors the root and alignment classes for RTL", () => {
    const rtl = rtlClasses("rtl");
    expect(rtl.root).toBe(RTL_ROOT_CLASS);
    expect(rtl.alignStart).toBe("text-right");
    expect(rtl.alignEnd).toBe("text-left");

    const ltr = rtlClasses("ltr");
    expect(ltr.root).toBe(LTR_ROOT_CLASS);
    expect(ltr.alignStart).toBe("text-left");
    expect(ltr.alignEnd).toBe("text-right");
  });

  it("uses Tailwind logical spacing so padding/margin flip automatically", () => {
    expect(logicalSpacing.paddingInlineStart).toBe("ps-3");
    expect(logicalSpacing.paddingInlineEnd).toBe("pe-3");
    expect(logicalSpacing.marginInlineStart).toBe("ms-2");
    expect(logicalSpacing.marginInlineEnd).toBe("me-2");
  });
});

describe("icon mirroring via the rtl: variant", () => {
  it("mirrors directional arrows/chevrons only in RTL", () => {
    expect(shouldMirrorIcon("arrow-right", "rtl")).toBe(true);
    expect(shouldMirrorIcon("chevron-left", "rtl")).toBe(true);
    expect(shouldMirrorIcon("external-link", "RTL")).toBe(true);
    expect(shouldMirrorIcon("arrow-right", "ltr")).toBe(false);
  });

  it("leaves symmetric icons unmirrored", () => {
    expect(shouldMirrorIcon("credit-card", "rtl")).toBe(false);
    expect(shouldMirrorIcon(undefined, "rtl")).toBe(false);
  });

  it("emits the Tailwind rtl: variant class", () => {
    expect(mirrorIconClass("arrow-right", "rtl")).toBe("rtl:-scale-x-100");
    expect(mirrorIconClass("arrow-right", "ltr")).toBe("");
    expect(rtlClasses("rtl").iconFlip).toContain("rtl:");
  });
});

describe("number/date formatting respects RTL", () => {
  it("uses the locale numbering system for numbers", () => {
    expect(formatNumber(1234, { locale: "ar" })).toMatch(ARABIC_INDIC_DIGITS);
    // Hebrew defaults to Latin digits but still localises grouping.
    expect(formatNumber(1234, { locale: "he" })).toMatch(/1[,.]?234/);
  });

  it("honours an explicit numbering system override", () => {
    expect(formatNumber(1234, { locale: "ar-u-nu-latn" })).toBe("1,234");
  });

  it("formats dates with RTL calendar conventions", () => {
    const date = new Date(2024, 0, 15);
    expect(formatDate(date, { style: "long", locale: "ar" })).toMatch(ARABIC);
    expect(formatDate(date, { style: "long", locale: "he" })).toMatch(HEBREW);
  });

  it("localises relative dates and lists for RTL locales", () => {
    const threeDaysAgo = Date.now() - 3 * 86_400_000 - 1000;
    expect(formatRelativeDate(threeDaysAgo, "ar")).toMatch(ARABIC);
    expect(formatList(["a", "b", "c"], "conjunction", "ar")).toMatch(ARABIC);
  });
});
