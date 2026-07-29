import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmissionChecklist } from "@/components/projects/SubmissionChecklist";

describe("SubmissionChecklist", () => {
  it("renders the checklist near the submit/edit flow with all named topics", () => {
    render(<SubmissionChecklist formData={{}} />);

    // Covers the topics named in #249: website, docs, logo, repository,
    // audit links, and verification request (contract IDs is covered in
    // the verification guidance panel, not as a separate form field).
    expect(screen.getByText("Project Website")).toBeInTheDocument();
    expect(screen.getByText("Documentation")).toBeInTheDocument();
    expect(screen.getByText("Logo URL")).toBeInTheDocument();
    expect(screen.getByText("Repository URL")).toBeInTheDocument();
    expect(screen.getByText("Audit Report")).toBeInTheDocument();
    expect(screen.getByText(/on-chain contract IDs/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Request verification after listing/i }),
    ).toHaveAttribute("href", "/verify");
  });

  it("marks completed items visually and tracks required vs optional counts", () => {
    // The count is rendered as separate JSX text nodes ("4" / "4"), so
    // check the whole container's normalized text content instead of
    // trying to match a single element.
    const { container } = render(
      <SubmissionChecklist
        formData={{
          name: "Soroban Swap",
          primaryCategory: "defi",
          websiteUrl: "https://example.com",
          description: "A description that is definitely long enough.",
        }}
      />,
    );
    const text = container.textContent?.replace(/\s+/g, "") ?? "";
    expect(text).toContain("4/4");
    expect(text).toContain("0/5");
  });

  it("does not block submission when only optional fields are missing", () => {
    render(
      <SubmissionChecklist
        formData={{
          name: "Soroban Swap",
          primaryCategory: "defi",
          websiteUrl: "https://example.com",
          description: "A description that is definitely long enough.",
        }}
      />,
    );

    // No "complete required fields" warning once required items are done,
    // even though every optional item (logo, docs, repo, audit, bounty)
    // is still missing.
    expect(
      screen.queryByText(/Complete all required fields to enable submission/i),
    ).not.toBeInTheDocument();
  });

  it("shows the blocking message only while required fields are missing", () => {
    render(<SubmissionChecklist formData={{}} />);

    expect(
      screen.getByText(/Complete all required fields to enable submission/i),
    ).toBeInTheDocument();
  });

  it("treats category as a required, tracked item", () => {
    const { container } = render(
      <SubmissionChecklist
        formData={{
          name: "Soroban Swap",
          websiteUrl: "https://example.com",
          description: "A description that is definitely long enough.",
          // primaryCategory intentionally omitted
        }}
      />,
    );

    expect(screen.getByText("Category")).toBeInTheDocument();
    const text = container.textContent?.replace(/\s+/g, "") ?? "";
    expect(text).toContain("3/4");
    expect(
      screen.getByText(/Complete all required fields to enable submission/i),
    ).toBeInTheDocument();
  });
});
