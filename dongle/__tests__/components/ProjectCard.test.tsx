import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectCard } from "@/components/projects/ProjectCard";
import type { Project } from "@/types/project";

const { comparisonMocks, watchlistMocks } = vi.hoisted(() => ({
  comparisonMocks: {
    addProject: vi.fn(),
    removeProject: vi.fn(),
    isSelected: vi.fn(() => false),
    canAddMore: true,
  },
  watchlistMocks: {
    isOnWatchlist: vi.fn(() => false),
    toggleWatchlist: vi.fn(),
    canManageWatchlist: true,
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// Render next/image as a plain img so onError can be fired from tests.
vi.mock("next/image", () => ({
  default: ({ src, alt, onError, className }: { src: string; alt: string; onError?: () => void; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={onError} />
  ),
}));

vi.mock("@/context/comparison.context", () => ({
  useComparison: () => comparisonMocks,
}));

vi.mock("@/hooks/useWatchlist", () => ({
  useWatchlist: () => watchlistMocks,
}));

const baseProject: Project = {
  id: "proj-1",
  name: "Stellar Lend",
  primaryCategory: "DeFi / DEX",
  description: "A lending protocol for the Stellar network",
  rating: 4.5,
  reviews: 128,
  createdAt: "2026-01-15T00:00:00.000Z",
  tags: ["lending", "defi"],
  websiteUrl: "https://stellarlend.example",
};

function renderCard(overrides: Partial<Project> = {}, verificationStatus?: Parameters<typeof ProjectCard>[0]["verificationStatus"]) {
  const project = { ...baseProject, ...overrides };
  return render(<ProjectCard project={project} verificationStatus={verificationStatus} />);
}

describe("ProjectCard component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    comparisonMocks.isSelected.mockReturnValue(false);
    comparisonMocks.canAddMore = true;
    watchlistMocks.isOnWatchlist.mockReturnValue(false);
    watchlistMocks.canManageWatchlist = true;
  });

  // ── Data rendering ────────────────────────────────────────────────────────

  it("renders the project name, category, description and review count", () => {
    renderCard();

    expect(screen.getByRole("heading", { level: 3, name: "Stellar Lend" })).toBeInTheDocument();
    expect(screen.getByText("DeFi / DEX")).toBeInTheDocument();
    expect(screen.getByText("A lending protocol for the Stellar network")).toBeInTheDocument();
    expect(screen.getByText("128 reviews")).toBeInTheDocument();
  });

  it("renders tags when the project has them", () => {
    renderCard();

    expect(screen.getByText("lending")).toBeInTheDocument();
    expect(screen.getByText("defi")).toBeInTheDocument();
  });

  it("omits the tag list when the project has no tags", () => {
    renderCard({ tags: [] });

    expect(screen.queryByText("lending")).not.toBeInTheDocument();
  });

  it("links to the project detail page", () => {
    renderCard();

    const link = screen.getByRole("link", { name: /stellar lend/i });
    expect(link).toHaveAttribute("href", "/projects/proj-1");
  });

  // ── Rating display ────────────────────────────────────────────────────────

  it("shows the numeric rating next to a star icon", () => {
    renderCard();

    expect(screen.getByText("4.5")).toBeInTheDocument();
    const ratingRow = screen.getByText("4.5").parentElement;
    expect(ratingRow?.querySelector("svg.lucide-star, svg[data-testid='star-icon'], svg")).toBeTruthy();
  });

  // ── Verification badge ────────────────────────────────────────────────────

  it.each([
    ["VERIFIED", "Verified"],
    ["PENDING", "Pending"],
    ["REJECTED", "Rejected"],
    ["NONE", "Unverified"],
  ])("shows the %s badge with its label", (status, label) => {
    renderCard({}, status as "VERIFIED");

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("does not show a verification badge without a status", () => {
    renderCard();

    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
    expect(screen.queryByText("Unverified")).not.toBeInTheDocument();
  });

  // ── Image loading and error states ────────────────────────────────────────

  it("renders the project image when a logo URL is present", () => {
    renderCard({ logoUrl: "https://cdn.example/lend.png" });

    expect(screen.getByAltText("Stellar Lend logo")).toHaveAttribute(
      "src",
      "https://cdn.example/lend.png",
    );
  });

  it("falls back to a letter avatar when the image fails to load", () => {
    renderCard({ logoUrl: "https://cdn.example/broken.png" });

    const img = screen.getByAltText("Stellar Lend logo");
    fireEvent.error(img);

    expect(screen.queryByAltText("Stellar Lend logo")).not.toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument(); // first letter of the name
  });

  it("shows a letter avatar when no logo URL exists", () => {
    renderCard();

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  // ── Comparison selection ──────────────────────────────────────────────────

  it("adds the project to comparison via the compare toggle", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: /add stellar lend to comparison/i }));

    expect(comparisonMocks.addProject).toHaveBeenCalledWith(baseProject);
    expect(comparisonMocks.removeProject).not.toHaveBeenCalled();
  });

  it("removes the project from comparison when already selected", async () => {
    comparisonMocks.isSelected.mockReturnValue(true);
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: /remove stellar lend from comparison/i }));

    expect(comparisonMocks.removeProject).toHaveBeenCalledWith("proj-1");
    expect(comparisonMocks.addProject).not.toHaveBeenCalled();
  });

  it("disables the compare toggle when the comparison limit is reached", () => {
    comparisonMocks.canAddMore = false;
    renderCard();

    const toggle = screen.getByRole("button", { name: new RegExp(`cannot add ${baseProject.name}`, "i") });
    expect(toggle).toBeDisabled();
  });

  it("hides the compare toggle when showCompareCheckbox is false", () => {
    render(<ProjectCard project={baseProject} showCompareCheckbox={false} />);

    expect(screen.queryByRole("button", { name: /comparison/i })).not.toBeInTheDocument();
  });

  it("reflects the selected state via aria-pressed", () => {
    comparisonMocks.isSelected.mockReturnValue(true);
    renderCard();

    expect(
      screen.getByRole("button", { name: /remove stellar lend from comparison/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  // ── Save button ───────────────────────────────────────────────────────────

  it("toggles the watchlist state from the bookmark button", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: /add stellar lend to watchlist/i }));

    expect(watchlistMocks.toggleWatchlist).toHaveBeenCalledWith("proj-1");
  });

  it("marks the watchlist button as pressed when the project is on the watchlist", () => {
    watchlistMocks.isOnWatchlist.mockReturnValue(true);
    renderCard();

    expect(
      screen.getByRole("button", { name: /remove stellar lend from watchlist/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("disables the watchlist button when the wallet cannot manage watchlist", () => {
    watchlistMocks.canManageWatchlist = false;
    renderCard();

    expect(screen.getByRole("button", { name: /add stellar lend to watchlist/i })).toBeDisabled();
  });

  // ── Keyboard navigation & focus states ────────────────────────────────────

  it("keeps action buttons out of the detail-page link", () => {
    renderCard();

    const link = screen.getByRole("link", { name: /stellar lend/i });
    const compareToggle = screen.getByRole("button", { name: /add stellar lend to comparison/i });

    // Buttons are siblings of the link, so activating them must not navigate.
    expect(link.contains(compareToggle)).toBe(false);
  });

  it("allows keyboard users to reach the card link and controls via Tab", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.tab();
    expect(screen.getByRole("button", { name: /add stellar lend to watchlist/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /add stellar lend to comparison/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: /stellar lend/i })).toHaveFocus();
  });
});
