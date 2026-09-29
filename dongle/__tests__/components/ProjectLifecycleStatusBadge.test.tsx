import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectLifecycleStatusBadge } from "@/components/projects/ProjectLifecycleStatusBadge";
import { PROJECT_STATUS_LABELS } from "@/types/project";

describe("ProjectLifecycleStatusBadge", () => {
  it("renders the label for a given status", () => {
    render(<ProjectLifecycleStatusBadge status="archived" />);
    expect(screen.getByText(PROJECT_STATUS_LABELS.archived)).toBeInTheDocument();
  });

  it("defaults to Active when status is omitted", () => {
    render(<ProjectLifecycleStatusBadge />);
    expect(screen.getByText(PROJECT_STATUS_LABELS.active)).toBeInTheDocument();
  });

  it("renders every known lifecycle status", () => {
    const { rerender } = render(<ProjectLifecycleStatusBadge status="active" />);
    for (const status of ["active", "paused", "deprecated", "archived", "flagged", "removed"] as const) {
      rerender(<ProjectLifecycleStatusBadge status={status} />);
      expect(screen.getByText(PROJECT_STATUS_LABELS[status])).toBeInTheDocument();
    }
  });
});
