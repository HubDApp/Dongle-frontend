import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormValueComparison, areValuesDifferent } from "@/components/ui/FormValueComparison";

describe("FormValueComparison component", () => {
  const original = {
    name: "Original Name",
    description: "Original Description",
    tags: ["defi", "dex"],
    websiteUrl: "https://original.com",
  };

  const current = {
    name: "Updated Name",
    description: "Original Description",
    tags: ["defi", "lending"],
    websiteUrl: "",
  };

  const labels = {
    name: "Project Name",
    description: "Description",
    tags: "Tags",
    websiteUrl: "Website URL",
  };

  it("identifies differences accurately", () => {
    expect(areValuesDifferent("foo", "foo")).toBe(false);
    expect(areValuesDifferent("foo", "bar")).toBe(true);
    expect(areValuesDifferent(["a", "b"], ["a", "b"])).toBe(false);
    expect(areValuesDifferent(["a"], ["b"])).toBe(true);
    expect(areValuesDifferent("", null)).toBe(false);
  });

  it("renders side-by-side values and highlights differences", () => {
    render(
      <FormValueComparison
        originalValues={original}
        currentValues={current}
        fieldLabels={labels}
      />
    );

    // Shows difference badge
    const badge = screen.getByTestId("difference-count-badge");
    expect(badge.textContent).toContain("3 fields modified");

    // Shows original and modified values
    expect(screen.getByText("Original Name")).toBeDefined();
    expect(screen.getByText("Updated Name")).toBeDefined();
    expect(screen.getAllByText("Modified").length).toBe(3);
  });

  it("calls onResetField when revert button is clicked", () => {
    const onResetField = vi.fn();
    render(
      <FormValueComparison
        originalValues={original}
        currentValues={current}
        fieldLabels={labels}
        onResetField={onResetField}
      />
    );

    const revertBtn = screen.getByRole("button", { name: /Revert Project Name to original/i });
    fireEvent.click(revertBtn);

    expect(onResetField).toHaveBeenCalledWith("name", "Original Name");
  });

  it("calls onResetAll when reset all button is clicked", () => {
    const onResetAll = vi.fn();
    render(
      <FormValueComparison
        originalValues={original}
        currentValues={current}
        fieldLabels={labels}
        onResetAll={onResetAll}
      />
    );

    const resetAllBtn = screen.getByRole("button", { name: /Reset All/i });
    fireEvent.click(resetAllBtn);

    expect(onResetAll).toHaveBeenCalledWith(original);
  });

  it("filters to only modified fields when toggle is clicked", () => {
    render(
      <FormValueComparison
        originalValues={original}
        currentValues={current}
        fieldLabels={labels}
      />
    );

    const toggleBtn = screen.getByRole("button", { name: /Show modified only/i });
    fireEvent.click(toggleBtn);

    // Description is unchanged, so in modified-only view it shouldn't be rendered in the table body rows
    expect(screen.queryByTestId("comparison-row-description")).toBeNull();
    expect(screen.getByTestId("comparison-row-name")).toBeDefined();
  });
});
