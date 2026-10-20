/**
 * Tests for read-only state — Issue #532
 *
 * Covers FormField, TextAreaField, SelectField, and Input:
 *  - read-only fields are focusable (keyboard accessible)
 *  - read-only fields show a "read-only" badge
 *  - read-only fields show error messages (value included in validation)
 *  - aria-readonly is present
 *  - native readOnly attribute is present (input/textarea)
 *  - visually distinct CSS classes
 *  - hidden screen-reader hint for read-only state
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { FormField } from "@/components/ui/FormField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { SelectField } from "@/components/ui/SelectField";
import { Input } from "@/components/ui/Input";

// ---- FormField — read-only ----------------------------------------------- //

describe("FormField — read-only state", () => {
  it("renders native readOnly attribute on the input", () => {
    render(<FormField label="Name" readOnly value="Dongle" onChange={() => {}} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it("sets aria-readonly on the input", () => {
    render(<FormField label="Name" readOnly value="Dongle" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-readonly")).toBe("true");
  });

  it("shows a visible 'read-only' badge", () => {
    render(<FormField label="Name" readOnly value="Dongle" onChange={() => {}} />);
    expect(screen.getByText("read-only")).toBeDefined();
  });

  it("does NOT show badge when NOT read-only", () => {
    render(<FormField label="Name" value="Dongle" onChange={() => {}} />);
    expect(screen.queryByText("read-only")).toBeNull();
  });

  it("shows error messages (validation runs for read-only fields)", () => {
    render(
      <FormField
        label="Name"
        readOnly
        value=""
        error="Name is required"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Name is required")).toBeDefined();
  });

  it("applies read-only visual styling class", () => {
    render(<FormField label="Name" readOnly value="Dongle" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/cursor-default/);
  });

  it("has a screen-reader hint for read-only state", () => {
    render(<FormField label="Name" readOnly value="Dongle" onChange={() => {}} />);
    const hint = screen.getByText("This field is read-only and cannot be edited.");
    expect(hint).toBeDefined();
    // The hint should be visually hidden (sr-only).
    expect(hint.className).toMatch(/sr-only/);
  });

  it("does not block focus (tabIndex is not -1)", () => {
    render(<FormField label="Name" readOnly value="Dongle" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    const tabIndex = input.getAttribute("tabindex");
    // Default tabindex for inputs is null (naturally focusable); not explicitly -1.
    expect(tabIndex).not.toBe("-1");
  });

  it("does not set disabled when only readOnly is true", () => {
    render(<FormField label="Name" readOnly value="Dongle" onChange={() => {}} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });
});

// ---- TextAreaField — read-only ------------------------------------------- //

describe("TextAreaField — read-only state", () => {
  it("renders native readOnly attribute on the textarea", () => {
    render(<TextAreaField label="Bio" readOnly value="Some text" onChange={() => {}} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.readOnly).toBe(true);
  });

  it("sets aria-readonly on the textarea", () => {
    render(<TextAreaField label="Bio" readOnly value="Some text" onChange={() => {}} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.getAttribute("aria-readonly")).toBe("true");
  });

  it("shows a visible 'read-only' badge", () => {
    render(<TextAreaField label="Bio" readOnly value="text" onChange={() => {}} />);
    expect(screen.getByText("read-only")).toBeDefined();
  });

  it("shows error messages (validation runs)", () => {
    render(
      <TextAreaField
        label="Bio"
        readOnly
        value=""
        error="Bio is required"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("applies read-only visual styling class", () => {
    render(<TextAreaField label="Bio" readOnly value="text" onChange={() => {}} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toMatch(/cursor-default/);
  });

  it("has a screen-reader hint", () => {
    render(<TextAreaField label="Bio" readOnly value="text" onChange={() => {}} />);
    expect(
      screen.getByText("This field is read-only and cannot be edited."),
    ).toBeDefined();
  });
});

// ---- SelectField — read-only --------------------------------------------- //

const options = [
  { value: "defi", label: "DeFi" },
  { value: "nft", label: "NFT" },
];

describe("SelectField — read-only state", () => {
  it("sets aria-readonly on the select", () => {
    render(
      <SelectField
        label="Category"
        options={options}
        readOnly
        value="defi"
        onChange={() => {}}
      />,
    );
    const select = screen.getByRole("combobox");
    expect(select.getAttribute("aria-readonly")).toBe("true");
  });

  it("shows a visible 'read-only' badge", () => {
    render(
      <SelectField
        label="Category"
        options={options}
        readOnly
        value="defi"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("read-only")).toBeDefined();
  });

  it("shows error messages (validation runs)", () => {
    render(
      <SelectField
        label="Category"
        options={options}
        readOnly
        value=""
        error="Select a category"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("blocks onChange when read-only", () => {
    const onChangeSpy = vi.fn();
    render(
      <SelectField
        label="Category"
        options={options}
        readOnly
        value="defi"
        onChange={onChangeSpy}
      />,
    );
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "nft" } });
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it("has a screen-reader hint", () => {
    render(
      <SelectField
        label="Category"
        options={options}
        readOnly
        value="defi"
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByText("This field is read-only and cannot be changed."),
    ).toBeDefined();
  });

  it("does NOT show badge when NOT read-only", () => {
    render(
      <SelectField label="Category" options={options} value="defi" onChange={() => {}} />,
    );
    expect(screen.queryByText("read-only")).toBeNull();
  });

  it("is not disabled when only readOnly is true", () => {
    render(
      <SelectField
        label="Category"
        options={options}
        readOnly
        value="defi"
        onChange={() => {}}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.disabled).toBe(false);
  });
});

// ---- Input base — read-only ---------------------------------------------- //

describe("Input — read-only state", () => {
  it("renders native readOnly attribute", () => {
    render(<Input readOnly value="hello" onChange={() => {}} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it("sets aria-readonly", () => {
    render(<Input readOnly value="hello" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-readonly")).toBe("true");
  });

  it("does NOT set aria-readonly when not read-only", () => {
    render(<Input value="hello" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-readonly")).toBeNull();
  });

  it("applies cursor-default class when read-only", () => {
    render(<Input readOnly value="hello" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/cursor-default/);
  });

  it("is still focusable (not pointer-events-none) when read-only", () => {
    render(<Input readOnly value="hello" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    // Read-only should not have pointer-events-none (that's for disabled).
    expect(input.className).not.toMatch(/pointer-events-none/);
  });
});
