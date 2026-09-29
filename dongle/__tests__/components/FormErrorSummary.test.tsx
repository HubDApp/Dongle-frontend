/**
 * Tests for FormErrorSummary — Issue #530
 *
 * Covers:
 *  - Hidden when errors array is empty
 *  - Lists all errors at top
 *  - Each item links to the errored field
 *  - Accessible role/aria attributes
 *  - Dark-mode compatible classes present
 *  - buildErrorItems helper
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  FormErrorSummary,
  buildErrorItems,
  type FormErrorItem,
} from "@/components/ui/FormErrorSummary";

const sampleErrors: FormErrorItem[] = [
  { fieldId: "name", label: "Project Name", message: "Name is required" },
  { fieldId: "url", label: "Website URL", message: "Must be a valid URL" },
];

describe("FormErrorSummary", () => {
  it("renders nothing when errors array is empty", () => {
    const { container } = render(<FormErrorSummary errors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when errors prop is omitted (defaults to empty)", () => {
    // @ts-expect-error — testing omission
    const { container } = render(<FormErrorSummary />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an alert region when there are errors", () => {
    render(<FormErrorSummary errors={sampleErrors} />);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("shows the default heading text", () => {
    render(<FormErrorSummary errors={sampleErrors} />);
    expect(
      screen.getByText("Please fix the following errors:"),
    ).toBeDefined();
  });

  it("shows a custom heading when provided", () => {
    render(
      <FormErrorSummary errors={sampleErrors} heading="Fix these issues:" />,
    );
    expect(screen.getByText("Fix these issues:")).toBeDefined();
  });

  it("lists all error labels and messages", () => {
    render(<FormErrorSummary errors={sampleErrors} />);
    expect(screen.getByText("Project Name")).toBeDefined();
    expect(screen.getByText("Name is required")).toBeDefined();
    expect(screen.getByText("Website URL")).toBeDefined();
    expect(screen.getByText("Must be a valid URL")).toBeDefined();
  });

  it("renders a link for each error pointing to the field id", () => {
    render(<FormErrorSummary errors={sampleErrors} />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("#name");
    expect(hrefs).toContain("#url");
  });

  it("clicking a link focuses the target field", () => {
    // Create a real DOM element with the expected id.
    const input = document.createElement("input");
    input.id = "name";
    document.body.appendChild(input);

    const focusSpy = vi.spyOn(input, "focus");

    render(<FormErrorSummary errors={sampleErrors} />);
    const link = screen.getAllByRole("link")[0];
    fireEvent.click(link);

    expect(focusSpy).toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("has aria-live='assertive' on the container", () => {
    render(<FormErrorSummary errors={sampleErrors} />);
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-live")).toBe("assertive");
  });

  it("includes accessible label describing error count", () => {
    render(<FormErrorSummary errors={sampleErrors} />);
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-label")).toContain("2 errors");
  });

  it("singular label when only one error", () => {
    render(<FormErrorSummary errors={[sampleErrors[0]]} />);
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-label")).toContain("1 error");
    expect(alert.getAttribute("aria-label")).not.toContain("errors");
  });

  it("has tabIndex=-1 so it can receive programmatic focus", () => {
    render(<FormErrorSummary errors={sampleErrors} />);
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("tabindex")).toBe("-1");
  });

  it("contains dark-mode CSS classes", () => {
    render(<FormErrorSummary errors={sampleErrors} />);
    const alert = screen.getByRole("alert");
    expect(alert.className).toMatch(/dark:/);
  });
});

describe("buildErrorItems helper", () => {
  it("returns an empty array when no errors match", () => {
    const result = buildErrorItems(
      {},
      { name: { id: "name", label: "Name" } },
    );
    expect(result).toHaveLength(0);
  });

  it("maps errors to FormErrorItem objects", () => {
    const errors = {
      name: { message: "Required" },
      url: { message: "Invalid URL" },
    };
    const result = buildErrorItems(errors, {
      name: { id: "name-field", label: "Name" },
      url: { id: "url-field", label: "URL" },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      fieldId: "name-field",
      label: "Name",
      message: "Required",
    });
    expect(result[1]).toEqual({
      fieldId: "url-field",
      label: "URL",
      message: "Invalid URL",
    });
  });

  it("skips fields with no error", () => {
    const errors = { name: { message: "Required" }, url: undefined };
    const result = buildErrorItems(errors, {
      name: { id: "name-field", label: "Name" },
      url: { id: "url-field", label: "URL" },
    });
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Name");
  });

  it("skips fields not in the fieldMap", () => {
    const errors = { name: { message: "Required" } };
    const result = buildErrorItems(errors, {
      // url is not provided in fieldMap
      url: { id: "url-field", label: "URL" },
    });
    expect(result).toHaveLength(0);
  });
});
