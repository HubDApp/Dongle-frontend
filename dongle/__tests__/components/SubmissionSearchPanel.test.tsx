import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubmissionSearchPanel } from "@/components/search/SubmissionSearchPanel";
import { DEFAULT_SUBMISSION_FILTERS } from "@/utils/submission-search.util";

describe("SubmissionSearchPanel", () => {
  it("renders search inputs and filters", () => {
    const onFiltersChange = vi.fn();
    render(
      <SubmissionSearchPanel
        filters={DEFAULT_SUBMISSION_FILTERS}
        submissions={[]}
        filteredCount={0}
        totalCount={0}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(
      screen.getByPlaceholderText(/search by field value/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Export Results/i)).toBeInTheDocument();
  });

  it("triggers filter updates on user input", () => {
    const onFiltersChange = vi.fn();
    render(
      <SubmissionSearchPanel
        filters={DEFAULT_SUBMISSION_FILTERS}
        submissions={[]}
        filteredCount={0}
        totalCount={0}
        onFiltersChange={onFiltersChange}
      />,
    );

    const input = screen.getByPlaceholderText(/search by field value/i);
    fireEvent.change(input, { target: { value: "test-query" } });
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ query: "test-query" }),
    );
  });
});
