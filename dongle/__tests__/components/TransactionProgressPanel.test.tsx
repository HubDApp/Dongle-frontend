import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TransactionProgressPanel from "@/components/transactions/TransactionProgressPanel";
import { createProgressState } from "@/lib/transaction-progress";

describe("TransactionProgressPanel", () => {
  it("renders signing phase guidance", () => {
    render(
      <TransactionProgressPanel progress={createProgressState("signing")} />,
    );

    expect(screen.getByText("Approve in Freighter")).toBeInTheDocument();
    expect(screen.getByText(/Freighter extension/i)).toBeInTheDocument();
  });

  it("shows retry action for retryable failures", () => {
    const onRetry = vi.fn();
    render(
      <TransactionProgressPanel
        progress={createProgressState("failure", {
          error: new Error("Network timeout"),
        })}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Retry transaction/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
