import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ComponentPlayground from "@/components/docs/ComponentPlayground";

describe("ComponentPlayground (#386)", () => {
  it("renders the Button playground by default", () => {
    render(<ComponentPlayground />);
    expect(screen.getByRole("tab", { name: "Button" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: "Submit project" })).toBeInTheDocument();
  });

  it("switches components and updates the live preview", async () => {
    const user = userEvent.setup();
    render(<ComponentPlayground />);

    await user.click(screen.getByRole("tab", { name: "Badge" }));
    expect(screen.getByRole("tab", { name: "Badge" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Verified")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Input" }));
    expect(screen.getByRole("textbox", { name: "Project name" })).toBeInTheDocument();
  });
});
