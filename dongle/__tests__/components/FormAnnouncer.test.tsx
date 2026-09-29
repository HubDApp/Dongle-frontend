/**
 * Tests for FormAnnouncer — Issue #529
 *
 * Covers:
 *  - Polite and assertive live regions are rendered
 *  - FormAnnouncer standalone component renders correct roles
 *  - useFormAnnouncer hook throws outside provider
 *  - Provider renders children
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import {
  FormAnnouncer,
  FormAnnouncerProvider,
  useFormAnnouncer,
} from "@/components/ui/FormAnnouncer";

// ---- Helper: consumer component ------------------------------------------ //

function AnnounceButton() {
  const { announce, announceError } = useFormAnnouncer();
  return (
    <>
      <button onClick={() => announce("Polite message")} data-testid="polite-btn">
        Polite
      </button>
      <button onClick={() => announceError("Error message")} data-testid="assertive-btn">
        Assertive
      </button>
    </>
  );
}

// -------------------------------------------------------------------------- //

describe("FormAnnouncer (standalone component)", () => {
  it("renders a polite live region", () => {
    render(<FormAnnouncer politeMessage="Saved" />);
    const region = screen.getByRole("status");
    expect(region).toBeDefined();
    expect(region.textContent).toBe("Saved");
  });

  it("renders an assertive live region", () => {
    render(<FormAnnouncer assertiveMessage="Error occurred" />);
    const region = screen.getByRole("alert");
    expect(region).toBeDefined();
    expect(region.textContent).toBe("Error occurred");
  });

  it("renders empty regions when no messages passed", () => {
    render(<FormAnnouncer />);
    const status = screen.getByRole("status");
    const alert = screen.getByRole("alert");
    expect(status.textContent).toBe("");
    expect(alert.textContent).toBe("");
  });
});

describe("FormAnnouncerProvider", () => {
  it("renders children", () => {
    render(
      <FormAnnouncerProvider>
        <span data-testid="child">hello</span>
      </FormAnnouncerProvider>,
    );
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("provides polite and assertive live regions in the DOM", () => {
    render(
      <FormAnnouncerProvider>
        <span />
      </FormAnnouncerProvider>,
    );
    // Two polite (status) and two assertive (alert) rotation slots.
    const statusRegions = screen.getAllByRole("status");
    const alertRegions = screen.getAllByRole("alert");
    expect(statusRegions.length).toBeGreaterThanOrEqual(2);
    expect(alertRegions.length).toBeGreaterThanOrEqual(2);
  });
});

describe("useFormAnnouncer hook", () => {
  it("throws when used outside provider", () => {
    // Suppress React error output for this test.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<AnnounceButton />)).toThrow(
      "useFormAnnouncer must be used inside a <FormAnnouncerProvider>.",
    );
    consoleSpy.mockRestore();
  });

  it("announce() updates a polite region", async () => {
    vi.useFakeTimers();

    render(
      <FormAnnouncerProvider>
        <AnnounceButton />
      </FormAnnouncerProvider>,
    );

    const politeBtn = screen.getByTestId("polite-btn");
    politeBtn.click();

    // Flush the zero-delay setTimeout inside announce().
    await act(async () => {
      vi.runAllTimers();
    });

    const statusRegions = screen.getAllByRole("status");
    const hasMessage = statusRegions.some((r) => r.textContent === "Polite message");
    expect(hasMessage).toBe(true);

    vi.useRealTimers();
  });

  it("announceError() updates an assertive region", async () => {
    vi.useFakeTimers();

    render(
      <FormAnnouncerProvider>
        <AnnounceButton />
      </FormAnnouncerProvider>,
    );

    const assertiveBtn = screen.getByTestId("assertive-btn");
    assertiveBtn.click();

    await act(async () => {
      vi.runAllTimers();
    });

    const alertRegions = screen.getAllByRole("alert");
    const hasMessage = alertRegions.some((r) => r.textContent === "Error message");
    expect(hasMessage).toBe(true);

    vi.useRealTimers();
  });
});
