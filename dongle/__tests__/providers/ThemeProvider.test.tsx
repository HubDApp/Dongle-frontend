import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AccessibilitySettingsPage from "@/app/settings/accessibility/page";
import { ThemeProvider } from "@/providers/ThemeProvider";

describe("high-contrast accessibility preference", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("high-contrast", "dark");
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    document.documentElement.classList.remove("high-contrast", "dark");
    document.documentElement.style.colorScheme = "";
  });

  it("toggles high contrast, announces its state, and restores it from localStorage", async () => {
    const firstRender = render(
      <ThemeProvider storageKey="test-theme">
        <AccessibilitySettingsPage />
      </ThemeProvider>,
    );
    const toggle = await screen.findByRole("switch", { name: "High contrast mode" });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("high-contrast");
      expect(localStorage.getItem("test-theme-high-contrast")).toBe("true");
    });
    expect(screen.getByRole("status")).toHaveTextContent("High contrast mode is on.");

    firstRender.unmount();
    render(
      <ThemeProvider storageKey="test-theme">
        <AccessibilitySettingsPage />
      </ThemeProvider>,
    );

    expect(await screen.findByRole("switch", { name: "High contrast mode" }))
      .toHaveAttribute("aria-checked", "true");
    await waitFor(() =>
      expect(document.documentElement).toHaveClass("high-contrast"),
    );
  });
});
