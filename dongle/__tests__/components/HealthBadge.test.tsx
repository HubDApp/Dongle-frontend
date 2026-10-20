import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthBadge } from "@/components/projects/HealthBadge";
import { HealthHistoryChart } from "@/components/projects/HealthHistoryChart";
import { computeHealthScore } from "@/lib/project-health/score";

const NOW = new Date("2026-10-19T12:00:00Z");

function makeHealth(overrides: Partial<Parameters<typeof computeHealthScore>[0]> = {}) {
  return computeHealthScore({
    createdAt: NOW.toISOString(),
    lastUpdateAt: NOW.toISOString(),
    rating: 0,
    reviewCount: 0,
    now: NOW,
    ...overrides,
  });
}

describe("HealthBadge", () => {
  it("shows the score and is color-coded by grade", () => {
    const health = makeHealth();
    render(<HealthBadge health={health} />);
    const badge = screen.getByText(`Health ${health.score}`).parentElement!;
    expect(badge).toHaveAttribute("data-grade", "good");
    expect(badge.className).toMatch(/lime/);
  });

  it("uses red styling for poor health", () => {
    const health = makeHealth({
      lastUpdateAt: null,
      createdAt: "2010-01-01T00:00:00Z",
      verificationStatus: "REJECTED",
      rating: 1,
      reviewCount: 500,
    });
    render(<HealthBadge health={health} />);
    const badge = screen.getByText(`Health ${health.score}`).parentElement!;
    expect(badge).toHaveAttribute("data-grade", "poor");
    expect(badge.className).toMatch(/red/);
  });

  it("explains the calculation in a tooltip linked to the badge", () => {
    const health = makeHealth();
    render(<HealthBadge health={health} />);
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    const badge = screen.getByText(`Health ${health.score}`).parentElement!;
    expect(badge).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveTextContent("Update recency");
    expect(tooltip).toHaveTextContent("Review sentiment");
    expect(tooltip).toHaveTextContent("Verification status");
    expect(tooltip).toHaveTextContent("GitHub activity");
    expect(tooltip).toHaveTextContent("On-chain volume");
    expect(tooltip).toHaveTextContent("n/a");
    expect(tooltip).toHaveTextContent(/weight shared/i);
  });

  it("shows a week-over-week trend when provided", () => {
    render(<HealthBadge health={makeHealth()} trend={-4} />);
    expect(screen.getByLabelText("down 4 this week")).toBeInTheDocument();
  });

  it("hides the trend when unchanged", () => {
    render(<HealthBadge health={makeHealth()} trend={0} />);
    expect(screen.queryByLabelText(/this week/)).toBeNull();
  });
});

describe("HealthHistoryChart", () => {
  it("asks for more data when there is fewer than two weeks", () => {
    render(<HealthHistoryChart history={[{ week: "2026-10-19", score: 50 }]} />);
    expect(screen.getByText(/check back next week/i)).toBeInTheDocument();
  });

  it("renders a labelled chart and an accessible data table", () => {
    render(
      <HealthHistoryChart
        history={[
          { week: "2026-10-05", score: 40 },
          { week: "2026-10-12", score: 55 },
          { week: "2026-10-19", score: 72 },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: /health score history: 40 .* to 72/i })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });
});
