import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { SyncStatusIndicator } from "@/components/backup";

describe("SyncStatusIndicator", () => {
  it.each([
    ["synced", "Synced"],
    ["syncing", "Syncing"],
    ["failed", "Sync failed"],
    ["disabled", "Sync off"],
  ] as const)("renders the %s status label", (status, label) => {
    render(<SyncStatusIndicator status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("surfaces the queued count while offline", () => {
    render(<SyncStatusIndicator status="offline" pendingCount={3} />);
    expect(screen.getByText("Offline · 3 queued")).toBeInTheDocument();
  });

  it("shows a plain offline label with no queued changes", () => {
    render(<SyncStatusIndicator status="offline" pendingCount={0} />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("is announced politely to assistive technology", () => {
    render(<SyncStatusIndicator status="synced" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("can hide the visible label while keeping it accessible", () => {
    render(<SyncStatusIndicator status="failed" showLabel={false} />);
    expect(screen.getByText("Sync failed")).toHaveClass("sr-only");
  });
});
