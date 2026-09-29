/**
 * Component-level checks for form RTL provider (Issue #546).
 */

import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormRtlProvider } from "@/components/forms/FormRtlProvider";
import { FormIcon } from "@/components/forms/FormIcon";

describe("FormRtlProvider", () => {
  it("flips form layout for Arabic (RTL)", () => {
    const { container } = render(
      <FormRtlProvider dir="rtl" locale="ar">
        <label>البريد الإلكتروني</label>
        <input aria-label="email" />
      </FormRtlProvider>,
    );

    const root = container.querySelector(".dongle-form");
    expect(root).toHaveAttribute("dir", "rtl");
    expect(root).toHaveAttribute("data-form-dir", "rtl");
    expect(root).toHaveAttribute("lang", "ar");
    expect(screen.getByText("البريد الإلكتروني")).toBeInTheDocument();
  });

  it("keeps LTR when forced", () => {
    const { container } = render(
      <FormRtlProvider dir="ltr" locale="en">
        <input aria-label="name" />
      </FormRtlProvider>,
    );

    expect(container.querySelector(".dongle-form")).toHaveAttribute("dir", "ltr");
  });

  it("mirrors directional icons in RTL", () => {
    const { container } = render(
      <FormRtlProvider dir="rtl">
        <FormIcon name="chevron-left">
          <svg data-testid="chevron" className="w-4 h-4" />
        </FormIcon>
      </FormRtlProvider>,
    );

    expect(
      container.querySelector("[data-testid='chevron']")?.getAttribute("class"),
    ).toMatch(/scale-x-100/);
  });
});
