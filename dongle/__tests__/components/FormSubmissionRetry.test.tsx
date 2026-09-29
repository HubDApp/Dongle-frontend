import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormSubmissionRetry } from "@/components/ui/FormSubmissionRetry";

describe("FormSubmissionRetry component", () => {
  it("renders retry button and error details on failure", () => {
    const onRetry = vi.fn();
    render(
      <FormSubmissionRetry
        error={new Error("Network connection lost")}
        onRetry={onRetry}
        retryCount={0}
        maxRetries={3}
      />
    );

    expect(screen.getByText(/Network Connection Issue/i)).toBeDefined();
    expect(screen.getByText(/preserved/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Retry Submission/i })).toBeDefined();
    expect(screen.getByTestId("retry-count-badge").textContent).toContain("0/3");
  });

  it("calls onRetry callback when button is clicked", () => {
    const onRetry = vi.fn();
    render(
      <FormSubmissionRetry
        error={new Error("Transaction rejected")}
        onRetry={onRetry}
        retryCount={1}
        maxRetries={3}
      />
    );

    const retryBtn = screen.getByRole("button", { name: /Retry Submission/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("enforces maximum retries and disables retry button when reached", () => {
    const onRetry = vi.fn();
    render(
      <FormSubmissionRetry
        error="Server error"
        onRetry={onRetry}
        retryCount={3}
        maxRetries={3}
      />
    );

    const retryBtn = screen.getByRole("button", { name: /Retry limit reached/i });
    expect(retryBtn.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Max retries reached/i)).toBeDefined();
    expect(screen.getByText(/Maximum retries enforced/i)).toBeDefined();

    fireEvent.click(retryBtn);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("shows wallet rejection specific message when user cancels", () => {
    render(
      <FormSubmissionRetry
        error="User rejected signing request"
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText(/Wallet Signature Declined/i)).toBeDefined();
  });
});
