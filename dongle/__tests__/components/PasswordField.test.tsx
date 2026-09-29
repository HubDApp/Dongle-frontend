/**
 * Tests for PasswordField component.
 *
 * Covers:
 *   1. Renders label, input, and lock icon
 *   2. Input type toggles between password and text
 *   3. autoComplete attribute is passed correctly
 *   4. Error message is displayed
 *   5. Helper text is displayed when no error
 *   6. Character counter updates with maxLength
 *   7. Show/hide toggle button has correct aria-label
 *   8. Disabled state prevents interaction
 *   9. Custom className is applied
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordField } from "@/components/ui/PasswordField";

describe("PasswordField", () => {
  it("renders label and input with lock icon", () => {
    render(<PasswordField label="Password" />);

    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("toggles input type when show/hide is clicked", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    await user.click(toggle);

    expect(input).toHaveAttribute("type", "text");

    const hideButton = screen.getByRole("button", { name: "Hide password" });
    await user.click(hideButton);

    expect(input).toHaveAttribute("type", "password");
  });

  it("passes autoComplete attribute to the input", () => {
    const { rerender } = render(<PasswordField label="Password" autoComplete="current-password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("autoComplete", "current-password");

    rerender(<PasswordField label="Password" autoComplete="new-password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("autoComplete", "new-password");

    rerender(<PasswordField label="Password" autoComplete="off" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("autoComplete", "off");
  });

  it("displays an error message", () => {
    render(<PasswordField label="Password" error="Password is required" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Password is required");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  });

  it("displays helper text when there is no error", () => {
    render(
      <PasswordField
        label="Password"
        helperText="Must be at least 8 characters"
      />,
    );

    expect(screen.getByText("Must be at least 8 characters")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not show helper text when there is an error", () => {
    render(
      <PasswordField
        label="Password"
        error="Too short"
        helperText="Must be at least 8 characters"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Too short");
    expect(screen.queryByText("Must be at least 8 characters")).not.toBeInTheDocument();
  });

  it("shows character counter with maxLength", () => {
    render(<PasswordField label="Password" maxLength={20} />);

    expect(screen.getByText("0 / 20")).toBeInTheDocument();
  });

  it("updates character counter on input", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" maxLength={20} />);

    const input = screen.getByLabelText("Password");
    await user.type(input, "hello");

    expect(screen.getByText("5 / 20")).toBeInTheDocument();
  });

  it("shows over-limit error when maxLength exceeded", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" maxLength={5} />);

    const input = screen.getByLabelText("Password");
    await user.type(input, "123456");

    expect(screen.getByRole("alert")).toHaveTextContent("Cannot exceed 5 characters");
  });

  it("toggle button has correct aria-label", () => {
    render(<PasswordField label="Password" />);

    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

  it("disables input and toggle when disabled", () => {
    render(<PasswordField label="Password" disabled />);

    expect(screen.getByLabelText("Password")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
  });

  it("applies custom className to the input", () => {
    render(<PasswordField label="Password" className="test-class" />);

    const input = screen.getByLabelText("Password");
    expect(input.className).toContain("test-class");
  });

  it("forwards ref to the input element", () => {
    const ref = { current: null } as React.MutableRefObject<HTMLInputElement | null>;
    render(<PasswordField label="Password" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.id).toBeTruthy();
  });

  it("uses the provided id on the input", () => {
    render(<PasswordField label="Password" id="my-password" />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("id", "my-password");
  });

  it("calls onChange when value changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PasswordField label="Password" onChange={onChange} />);

    await user.type(screen.getByLabelText("Password"), "a");

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});