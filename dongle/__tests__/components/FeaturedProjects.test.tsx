import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FeaturedProjects from "@/components/landing/FeaturedProjects";
import { projects, ALL_CATEGORIES } from "@/data/projects";

// Mock next/link to a plain anchor so we don't need the Next.js router
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  sessionStorage.clear();
});

describe("FeaturedProjects component", () => {
  it("renders the section heading", async () => {
    render(<FeaturedProjects />);
    expect(await screen.findByText("Featured Projects")).toBeInTheDocument();
  });

  it("renders a 'View all projects' link pointing to /discover", async () => {
    render(<FeaturedProjects />);
    const link = await screen.findByRole("link", { name: /view all projects/i });
    expect(link).toHaveAttribute("href", "/discover");
  });

  it("renders category filter buttons for all categories", async () => {
    render(<FeaturedProjects />);
    for (const cat of ALL_CATEGORIES) {
      expect(await screen.findByRole("button", { name: cat })).toBeInTheDocument();
    }
  });

  it("renders sort dropdown with all options", async () => {
    render(<FeaturedProjects />);
    const select = await screen.findByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Top Rated" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Newest" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Most Reviewed" })).toBeInTheDocument();
  });

  it("shows at most 6 project cards after hydration", async () => {
    render(<FeaturedProjects />);
    // Wait for hydration — project names appear
    await screen.findByText(projects[0].name);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.length).toBeLessThanOrEqual(6);
  });

  it("filters projects when a category button is clicked", async () => {
    render(<FeaturedProjects />);
    await screen.findByText(projects[0].name); // wait for hydration

    const defiBtn = screen.getByRole("button", { name: "DeFi / DEX" });
    fireEvent.click(defiBtn);

    await waitFor(() => {
      expect(defiBtn).toHaveAttribute("aria-pressed", "true");
    });

    const defiProjects = projects.filter((p) => p.category === "DeFi / DEX");
    for (const p of defiProjects) {
      expect(screen.getByText(p.name)).toBeInTheDocument();
    }
  });

  it("shows empty state when no projects match the selected category", async () => {
    // Temporarily mock projects to have no DAO entries — instead just pick a
    // category that has no projects by filtering to a known-empty state.
    // We'll click "DAO" and if there are DAO projects they show; if not, empty state shows.
    // This test verifies the empty state renders without crashing.
    render(<FeaturedProjects />);
    await screen.findByText(projects[0].name);

    // Find a category with zero projects (if any)
    const emptyCategory = ALL_CATEGORIES.find(
      (cat) => cat !== "All" && !projects.some((p) => p.category === cat)
    );

    if (emptyCategory) {
      fireEvent.click(screen.getByRole("button", { name: emptyCategory }));
      await screen.findByText(/no projects found/i);
    } else {
      // All categories have projects — just verify no crash on category switch
      fireEvent.click(screen.getByRole("button", { name: "DeFi / DEX" }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "DeFi / DEX" })
        ).toHaveAttribute("aria-pressed", "true")
      );
    }
  });

  it("updates sort when dropdown changes", async () => {
    render(<FeaturedProjects />);
    await screen.findByText(projects[0].name);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "recency" } });

    await waitFor(() => {
      expect((select as HTMLSelectElement).value).toBe("recency");
    });
  });

  it("persists filter state to sessionStorage on interaction", async () => {
    render(<FeaturedProjects />);
    await screen.findByText(projects[0].name);

    fireEvent.click(screen.getByRole("button", { name: "Infrastructure" }));

    await waitFor(() => {
      const stored = JSON.parse(
        sessionStorage.getItem("dongle_project_filters") ?? "{}"
      );
      expect(stored.category).toBe("Infrastructure");
    });
  });
});
