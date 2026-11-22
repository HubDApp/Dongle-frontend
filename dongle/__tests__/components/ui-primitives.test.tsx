/**
 * Interaction tests for the primitive UI components:
 * Badge, Card, IconButton, Button and Input.
 *
 * Coverage focus (per the issue's acceptance criteria):
 *   • Badge      → click handler
 *   • Card       → hover interaction
 *   • IconButton → click, keyboard (Enter/Space) and disabled state
 *   • Button     → loading state and icon positioning
 *   • Input      → onChange, onBlur and error state
 *
 * All interactions are driven with @testing-library/user-event so they mirror
 * real browser behaviour (pointer + keyboard), and every suite asserts the
 * relevant ARIA surface.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

describe("Badge", () => {
  it("renders its content and applies the default (primary) variant", () => {
    render(<Badge data-testid="badge">Verified</Badge>);

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent("Verified");
    expect(badge.className).toMatch(/bg-blue-100/);
  });

  it("calls the click handler once per click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Badge data-testid="badge" role="button" tabIndex={0} onClick={onClick}>
        Clickable
      </Badge>,
    );

    await user.click(screen.getByTestId("badge"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards keyboard events so a caller can wire activation", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();

    render(
      <Badge data-testid="badge" role="button" tabIndex={0} onKeyDown={onKeyDown}>
        Verified
      </Badge>,
    );

    await user.tab();
    expect(screen.getByTestId("badge")).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("forwards ARIA attributes so it can be exposed as an accessible control", () => {
    render(
      <Badge role="button" tabIndex={0} aria-label="Filter: verified" data-testid="badge">
        Verified
      </Badge>,
    );

    const badge = screen.getByRole("button", { name: "Filter: verified" });
    expect(badge).toBe(screen.getByTestId("badge"));
    expect(badge).toHaveAttribute("tabindex", "0");
  });

  it("maps every variant to its own color treatment", () => {
    const variants = [
      ["primary", /bg-blue-100/],
      ["secondary", /bg-zinc-100/],
      ["success", /bg-green-100/],
      ["warning", /bg-amber-100/],
      ["error", /bg-red-100/],
      ["outline", /bg-transparent/],
    ] as const;

    for (const [variant, pattern] of variants) {
      const { unmount } = render(
        <Badge variant={variant} data-testid="badge">
          {variant}
        </Badge>,
      );
      expect(screen.getByTestId("badge").className).toMatch(pattern);
      unmount();
    }
  });

  it("merges a custom className with the variant classes", () => {
    render(
      <Badge data-testid="badge" className="custom-badge">
        Custom
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("custom-badge");
    expect(badge.className).toMatch(/rounded-full/);
  });
});

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

describe("Card", () => {
  it("renders its children with the default surface", () => {
    render(<Card data-testid="card">Card body</Card>);

    const card = screen.getByTestId("card");
    expect(card).toHaveTextContent("Card body");
    expect(card.className).toMatch(/bg-white/);
    expect(card.className).toMatch(/rounded-\[2rem\]/);
  });

  it("fires mouse enter/leave handlers when the user hovers the card", async () => {
    const user = userEvent.setup();
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();

    render(
      <Card data-testid="card" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        Hover me
      </Card>,
    );

    const card = screen.getByTestId("card");

    await user.hover(card);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).not.toHaveBeenCalled();

    await user.unhover(card);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });

  it("forwards hover styling classes supplied by the caller", () => {
    render(
      <Card data-testid="card" className="hover:shadow-lg hover:bg-zinc-50">
        Styled
      </Card>,
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("hover:shadow-lg");
    expect(card).toHaveClass("hover:bg-zinc-50");
  });

  it("applies each variant and padding combination", () => {
    const variants = ["default", "glass", "outline"] as const;
    const paddings = ["none", "sm", "md", "lg"] as const;
    const paddingClasses: Record<(typeof paddings)[number], string> = {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    for (const variant of variants) {
      for (const padding of paddings) {
        const { unmount } = render(
          <Card variant={variant} padding={padding} data-testid="card">
            {variant}
          </Card>,
        );
        expect(screen.getByTestId("card")).toHaveClass(paddingClasses[padding]);
        unmount();
      }
    }
  });

  it("exposes any landmark role given to it for assistive technology", () => {
    render(
      <Card role="region" aria-label="Subscription summary" data-testid="card">
        Summary
      </Card>,
    );

    expect(screen.getByRole("region", { name: "Subscription summary" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IconButton
// ---------------------------------------------------------------------------

describe("IconButton", () => {
  const renderIcon = (props: Record<string, unknown> = {}) => (
    <IconButton aria-label="Remove item" {...props}>
      <span data-testid="icon" />
    </IconButton>
  );

  it("renders a button whose accessible name comes from aria-label", () => {
    render(renderIcon());

    const button = screen.getByRole("button", { name: "Remove item" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Remove item");
  });

  it("invokes the click handler when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(renderIcon({ onClick }));
    await user.click(screen.getByRole("button", { name: "Remove item" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is activatable with the Enter key", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(renderIcon({ onClick }));

    await user.tab();
    const button = screen.getByRole("button", { name: "Remove item" });
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is activatable with the Space key", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(renderIcon({ onClick }));

    await user.tab();
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire click or accept focus when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(renderIcon({ onClick, disabled: true }));

    const button = screen.getByRole("button", { name: "Remove item" });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).not.toHaveFocus();
  });

  it("sizes the icon according to the size prop", () => {
    const sizes = [
      ["sm", /w-4 h-4/],
      ["md", /w-5 h-5/],
      ["lg", /w-6 h-6/],
    ] as const;

    for (const [size, pattern] of sizes) {
      const { unmount } = render(renderIcon({ size }));
      expect(screen.getByTestId("icon").className).toMatch(pattern);
      unmount();
    }
  });

  it("applies variant-specific styling", () => {
    const { rerender } = render(renderIcon({ variant: "error" }));
    expect(screen.getByRole("button", { name: "Remove item" }).className).toMatch(
      /hover:text-red-500/,
    );

    rerender(renderIcon({ variant: "ghost" }));
    expect(screen.getByRole("button", { name: "Remove item" }).className).toMatch(
      /hover:bg-zinc-100/,
    );
  });
});

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

describe("Button", () => {
  it("positions the left icon before and the right icon after the label", () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon" />}
        rightIcon={<span data-testid="right-icon" />}
      >
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: /Save/ });
    expect(button.firstElementChild).toBe(screen.getByTestId("left-icon"));
    expect(button.lastElementChild).toBe(screen.getByTestId("right-icon"));
  });

  it("replaces the left icon with a spinner and hides the right icon while loading", () => {
    const { container } = render(
      <Button
        isLoading
        leftIcon={<span data-testid="left-icon" />}
        rightIcon={<span data-testid="right-icon" />}
      >
        Save
      </Button>,
    );

    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.queryByTestId("left-icon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("right-icon")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("exposes the loading state through aria-busy and disables the button", () => {
    render(<Button isLoading>Save</Button>);

    const button = screen.getByRole("button", { name: /Save/ });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("announces the loading state in a polite live region", () => {
    render(
      <Button isLoading loadingText="Saving review...">
        Save
      </Button>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Saving review...");
  });

  it("is activatable with the keyboard when enabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Submit</Button>);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);

    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("ignores clicks while disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Submit
      </Button>,
    );

    const button = screen.getByRole("button", { name: /Submit/ });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the requested variant and size classes", () => {
    const { rerender } = render(
      <Button variant="error" size="lg">
        Delete
      </Button>,
    );
    let button = screen.getByRole("button", { name: /Delete/ });
    expect(button.className).toMatch(/bg-red-500/);
    expect(button.className).toMatch(/rounded-\[1\.5rem\]/);

    rerender(
      <Button variant="outline" size="sm">
        Delete
      </Button>,
    );
    button = screen.getByRole("button", { name: /Delete/ });
    expect(button.className).toMatch(/bg-transparent/);
    expect(button.className).toMatch(/rounded-xl/);
  });
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

describe("Input", () => {
  it("calls onChange as the user types and reflects the typed value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Input aria-label="Project name" onChange={onChange} />);

    const input = screen.getByLabelText("Project name");
    await user.type(input, "Dongle");

    expect(onChange).toHaveBeenCalledTimes(6);
    expect(input).toHaveValue("Dongle");
  });

  it("calls onBlur when focus leaves the field", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();

    render(<Input aria-label="Email" onBlur={onBlur} />);

    const input = screen.getByLabelText("Email");
    await user.click(input);
    expect(input).toHaveFocus();

    await user.tab();
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(input).not.toHaveFocus();
  });

  it("renders the error styling and forwards the invalid ARIA wiring", () => {
    render(
      <Input
        error
        aria-label="Email"
        aria-invalid="true"
        aria-describedby="email-error"
      />,
    );

    const input = screen.getByLabelText("Email");
    expect(input.className).toMatch(/border-red-500\/50/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "email-error");
  });

  it("omits the error styling when the field is valid", () => {
    render(<Input aria-label="Email" />);

    expect(screen.getByLabelText("Email").className).not.toMatch(/border-red-500\/50/);
  });

  it("exposes read-only state through aria-readonly and keeps it focusable", async () => {
    const user = userEvent.setup();

    render(<Input readOnly aria-label="Owner" value="stellar:GABC" onChange={() => {}} />);

    const input = screen.getByLabelText("Owner");
    expect(input).toHaveAttribute("aria-readonly", "true");
    expect(input).not.toBeDisabled();

    await user.click(input);
    expect(input).toHaveFocus();
  });

  it("exposes disabled state through the disabled and aria-disabled attributes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Input disabled aria-label="Owner" onChange={onChange} />);

    const input = screen.getByLabelText("Owner");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-disabled", "true");

    await user.type(input, "text");
    expect(onChange).not.toHaveBeenCalled();
  });
});
