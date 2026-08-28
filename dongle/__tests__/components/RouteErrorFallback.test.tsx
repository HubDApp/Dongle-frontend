import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("RouteErrorFallback", () => {
  it("shows a friendly message without the raw stack", () => {
    const error = new Error("boom");
    error.stack = "Error: boom\n    at secret.ts:1:1";

    render(
      <RouteErrorFallback
        error={error}
        reset={() => {}}
        section="reviews"
      />,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong in reviews/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/secret\.ts/)).not.toBeInTheDocument();
    expect(screen.queryByText("boom")).not.toBeInTheDocument();
  });

  it("offers retry and home actions", () => {
    const reset = vi.fn();
    render(
      <RouteErrorFallback
        error={new Error("fail")}
        reset={reset}
        section="verification"
      />,
    );

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /home/i })).toBeInTheDocument();
  });
});
