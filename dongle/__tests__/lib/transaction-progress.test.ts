import { describe, it, expect } from "vitest";
import {
  createProgressState,
  getTransactionPhaseMessage,
  isTransactionPhaseRetryable,
  isUserRejectionError,
} from "@/lib/transaction-progress";

describe("transaction-progress", () => {
  it("describes signing vs confirming phases distinctly", () => {
    expect(getTransactionPhaseMessage("signing")).toContain("Freighter");
    expect(getTransactionPhaseMessage("confirming", { txHash: "ABCDEF123456" })).toContain(
      "confirmation",
    );
  });

  it("marks user rejections as non-retryable by default", () => {
    const error = new Error("User rejected the request");
    expect(isUserRejectionError(error)).toBe(true);
    expect(isTransactionPhaseRetryable(error)).toBe(false);
    expect(createProgressState("failure", { error }).retryable).toBe(false);
  });

  it("allows retry guidance for network failures", () => {
    const error = new Error("Timeout waiting for transaction");
    expect(createProgressState("failure", { error }).retryable).toBe(true);
    expect(getTransactionPhaseMessage("failure", { error })).toContain("retry");
  });
});
