import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormSkeleton } from "@/components/ui/FormSkeleton";

describe("FormSkeleton component", () => {
  it("renders with proper accessibility attributes", () => {
    render(<FormSkeleton ariaLabel="Loading project form..." />);

    const statusEl = screen.getByRole("status");
    expect(statusEl).toBeDefined();
    expect(statusEl.getAttribute("aria-busy")).toBe("true");
    expect(statusEl.getAttribute("aria-label")).toBe("Loading project form...");
    expect(screen.getByText("Loading project form...")).toBeDefined();
  });

  it("renders header skeleton by default", () => {
    const { container } = render(<FormSkeleton showHeader={true} />);
    // Icon box skeleton should be present
    const iconSkeleton = container.querySelector(".rounded-2xl");
    expect(iconSkeleton).toBeDefined();
  });

  it("can hide header skeleton when configured", () => {
    const { container } = render(<FormSkeleton showHeader={false} />);
    const headerTitle = container.querySelector(".h-7");
    expect(headerTitle).toBeNull();
  });

  it("can render without card container wrapper", () => {
    const { container } = render(<FormSkeleton asCard={false} />);
    expect(container.querySelector(".backdrop-blur-md")).toBeNull();
  });
});
