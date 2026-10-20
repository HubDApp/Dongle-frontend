/**
 * Unit tests for form RTL helpers (Issue #546).
 */

import { describe, expect, it } from "vitest";
import {
  formDirectionProps,
  formRtlClasses,
  isFormRtl,
  mirrorIconClass,
  resolveFormDirection,
  shouldMirrorIcon,
} from "@/lib/forms/rtl";

describe("resolveFormDirection", () => {
  it("uses explicit dir override", () => {
    expect(resolveFormDirection({ dir: "rtl", locale: "en" })).toBe("rtl");
  });

  it("derives RTL from Arabic / Hebrew locales", () => {
    expect(resolveFormDirection({ locale: "ar" })).toBe("rtl");
    expect(resolveFormDirection({ locale: "he-IL" })).toBe("rtl");
    expect(resolveFormDirection({ locale: "en" })).toBe("ltr");
  });
});

describe("form layout helpers", () => {
  it("flips alignment classes for RTL", () => {
    const rtl = formRtlClasses("rtl");
    expect(rtl.root).toContain("direction-rtl");
    expect(rtl.alignStart).toBe("text-right");
    expect(rtl.alignEnd).toBe("text-left");
  });

  it("returns direction props suitable for form roots", () => {
    const props = formDirectionProps({ locale: "ar" });
    expect(props.dir).toBe("rtl");
    expect(props["data-form-dir"]).toBe("rtl");
    expect(props.lang).toBe("ar");
  });
});

describe("icon mirroring", () => {
  it("mirrors directional icons only in RTL", () => {
    expect(shouldMirrorIcon("chevron-left", "rtl")).toBe(true);
    expect(shouldMirrorIcon("chevron-left", "ltr")).toBe(false);
    expect(shouldMirrorIcon("credit-card", "rtl")).toBe(false);
    expect(mirrorIconClass("arrow-right", "rtl")).toContain("scale-x-100");
  });
});

describe("isFormRtl", () => {
  it("is true for RTL locales", () => {
    expect(isFormRtl({ locale: "ar" })).toBe(true);
    expect(isFormRtl({ locale: "es" })).toBe(false);
  });
});
