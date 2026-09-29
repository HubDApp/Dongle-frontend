/**
 * Tests for disabled state handling — Issue #531
 *
 * Covers FormField, TextAreaField, SelectField, and Input:
 *  - Disabled fields skip validation error display
 *  - Disabled fields do not show character counters
 *  - Visual indication (opacity/cursor classes)
 *  - aria-disabled is present
 *  - Native disabled attribute is present
 *  - Label is styled differently when disabled
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { FormField } from "@/components/ui/FormField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { SelectField } from "@/components/ui/SelectField";
import { Input } from "@/components/ui/Input";

// ---- FormField ------------------------------------------------------------ //

describe("FormField — disabled state", () => {
  it("renders the native disabled attribute", () => {
    render(<FormField label="Name" disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveProperty("disabled", true);
  });

  it("sets aria-disabled on the input", () => {
    render(<FormField label="Name" disabled />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-disabled")).toBe("true");
  });

  it("does NOT show error message when disabled", () => {
    render(
      <FormField label="Name" disabled error="This field is required" />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("This field is required")).toBeNull();
  });

  it("shows error message when NOT disabled", () => {
    render(<FormField label="Name" error="This field is required" />);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("does NOT show character counter when disabled", () => {
    render(<FormField label="Name" disabled maxLength={100} value="hello" />);
    expect(screen.queryByText(/\/ 100/)).toBeNull();
  });

  it("shows character counter when NOT disabled", () => {
    render(<FormField label="Name" maxLength={100} value="hello" onChange={() => {}} />);
    expect(screen.getByText("5 / 100")).toBeDefined();
  });

  it("applies opacity/cursor-not-allowed class when disabled", () => {
    render(<FormField label="Name" disabled />);
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/opacity-50|cursor-not-allowed/);
  });

  it("dims the label when disabled", () => {
    render(<FormField label="Name" disabled />);
    const label = screen.getByText("Name");
    // Should contain one of the disabled label color classes.
    expect(label.className).toMatch(/text-zinc-400|text-zinc-600/);
  });
});

// ---- TextAreaField -------------------------------------------------------- //

describe("TextAreaField — disabled state", () => {
  it("renders the native disabled attribute", () => {
    render(<TextAreaField label="Description" disabled />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveProperty("disabled", true);
  });

  it("sets aria-disabled on the textarea", () => {
    render(<TextAreaField label="Description" disabled />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.getAttribute("aria-disabled")).toBe("true");
  });

  it("does NOT show error message when disabled", () => {
    render(
      <TextAreaField label="Description" disabled error="Too short" />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows error message when NOT disabled", () => {
    render(<TextAreaField label="Description" error="Too short" />);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("does NOT show character counter when disabled", () => {
    render(
      <TextAreaField label="Description" disabled maxLength={200} value="hi" />,
    );
    expect(screen.queryByText(/\/ 200/)).toBeNull();
  });

  it("applies opacity/cursor class when disabled", () => {
    render(<TextAreaField label="Description" disabled />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toMatch(/opacity-50|cursor-not-allowed/);
  });
});

// ---- SelectField --------------------------------------------------------- //

const options = [
  { value: "defi", label: "DeFi" },
  { value: "nft", label: "NFT" },
];

describe("SelectField — disabled state", () => {
  it("renders the native disabled attribute", () => {
    render(<SelectField label="Category" options={options} disabled />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveProperty("disabled", true);
  });

  it("sets aria-disabled on the select", () => {
    render(<SelectField label="Category" options={options} disabled />);
    const select = screen.getByRole("combobox");
    expect(select.getAttribute("aria-disabled")).toBe("true");
  });

  it("does NOT show error message when disabled", () => {
    render(
      <SelectField
        label="Category"
        options={options}
        disabled
        error="Please select a category"
      />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows error when NOT disabled", () => {
    render(
      <SelectField
        label="Category"
        options={options}
        error="Please select a category"
      />,
    );
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("applies opacity/cursor class when disabled", () => {
    render(<SelectField label="Category" options={options} disabled />);
    const select = screen.getByRole("combobox");
    expect(select.className).toMatch(/opacity-50|cursor-not-allowed/);
  });
});

// ---- Input base component ------------------------------------------------ //

describe("Input — disabled state", () => {
  it("renders the native disabled attribute", () => {
    render(<Input disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveProperty("disabled", true);
  });

  it("sets aria-disabled when disabled", () => {
    render(<Input disabled />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-disabled")).toBe("true");
  });

  it("does NOT set aria-disabled when not disabled", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-disabled")).toBeNull();
  });

  it("applies opacity/cursor class when disabled", () => {
    render(<Input disabled />);
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/opacity-50|cursor-not-allowed/);
  });
});
