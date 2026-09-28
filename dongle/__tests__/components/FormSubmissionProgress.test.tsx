import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FormSubmissionProgress,
  calculateProgressPercent,
  type SubmissionStep,
} from "@/components/ui/FormSubmissionProgress";

const mockSteps: SubmissionStep[] = [
  { id: "validate", name: "Validate Form", description: "Checking input constraints" },
  { id: "simulate", name: "Simulate Tx", description: "Running on-chain simulation" },
  { id: "sign", name: "Sign in Wallet", description: "Awaiting Freighter approval" },
  { id: "confirm", name: "Confirm Ledger", description: "Waiting for network confirmation" },
];

describe("FormSubmissionProgress component", () => {
  it("renders progress bar, percentage, step names, and highlights active step", () => {
    render(
      <FormSubmissionProgress
        steps={mockSteps}
        currentStepIndex={1}
        status="in-progress"
      />
    );

    // Progress bar displays
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeDefined();

    // Step names shown
    expect(screen.getByText("Validate Form")).toBeDefined();
    expect(screen.getByText("Simulate Tx")).toBeDefined();
    expect(screen.getByText("Sign in Wallet")).toBeDefined();
    expect(screen.getByText("Confirm Ledger")).toBeDefined();

    // Percentage complete displays
    const percentEl = screen.getByTestId("progress-percent");
    expect(percentEl.textContent).toMatch(/%/);

    // Current step highlighted (active badge)
    const activeStepEl = screen.getByTestId("submission-step-1");
    expect(activeStepEl.textContent).toContain("Active");
  });

  it("calculates percentage accurately across steps", () => {
    expect(calculateProgressPercent(0, 4, "idle")).toBe(0);
    expect(calculateProgressPercent(0, 4, "success")).toBe(100);

    const midPercent = calculateProgressPercent(2, 4, "in-progress");
    expect(midPercent).toBeGreaterThan(40);
    expect(midPercent).toBeLessThan(100);
  });

  it("shows retry button on error if onRetry provided", () => {
    const onRetry = vi.fn();
    render(
      <FormSubmissionProgress
        steps={mockSteps}
        currentStepIndex={2}
        status="error"
        errorMessage="Signature rejected"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText("Signature rejected")).toBeDefined();
    expect(screen.getByRole("button", { name: /Retry from current step/i })).toBeDefined();
  });
});
