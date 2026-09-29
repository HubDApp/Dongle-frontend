import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button loading states", () => {
  it("keeps the label visible while loading", () => {
    render(<Button isLoading>Submit Project</Button>);

    expect(screen.getByRole("button", { name: /Submit Project/i })).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("uses loadingText as the accessible label when provided", () => {
    render(
      <Button isLoading loadingText="Updating project...">
        Update Project
      </Button>,
    );

    expect(
      screen.getByRole("button", { name: /Updating project/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Update Project")).not.toBeInTheDocument();
  });

  it("announces operation-specific loading state in a live region outside the button", () => {
    const { rerender } = render(
      <Button isLoading loadingText="Saving review...">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: /Saving review/i });
    const status = screen.getByRole("status");
    expect(button).not.toHaveAttribute("aria-live");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveClass("sr-only");
    expect(status).toHaveTextContent("Saving review...");

    rerender(<Button loadingText="Saving review...">Save</Button>);
    expect(status).toHaveTextContent("");
  });

  it("replaces the left icon with a spinner and keeps the label", () => {
    const { container } = render(
      <Button
        isLoading
        leftIcon={<span data-testid="left-icon">icon</span>}
      >
        Save
      </Button>,
    );

    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.queryByTestId("left-icon")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("exposes a screen-reader loading label for icon-only buttons", () => {
    render(
      <Button isLoading leftIcon={<span data-testid="only-icon">icon</span>} />,
    );

    expect(screen.getByText("Loading...")).toHaveClass("sr-only");
  });

  it("prevents duplicate submits while loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button isLoading onClick={onClick}>
        Submit
      </Button>,
    );

    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
