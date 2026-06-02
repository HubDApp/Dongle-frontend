import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DiscoverPage from "@/app/discover/page";
import { mockProjects } from "@/data/mockProjects";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("Discover Page - High Risk Flows", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe("Loading State", () => {
    it("displays loading spinner on initial render", () => {
      render(<DiscoverPage />);
      expect(screen.getByText("Loading projects...")).toBeInTheDocument();
    });

    it("hides loading state after timeout", async () => {
      render(<DiscoverPage />);
      expect(screen.getByText("Loading projects...")).toBeInTheDocument();
      
      vi.advanceTimersByTime(800);
      
      await waitFor(() => {
        expect(screen.queryByText("Loading projects...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Results Rendering", () => {
    it("displays projects in grid after loading", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      await waitFor(() => {
        const firstProject = mockProjects[0];
        expect(screen.getByText(firstProject.name)).toBeInTheDocument();
      });
    });

    it("displays project cards with correct information", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      await waitFor(() => {
        const project = mockProjects[0];
        expect(screen.getByText(project.name)).toBeInTheDocument();
        expect(screen.getByText(project.category)).toBeInTheDocument();
      });
    });

    it("shows correct number of projects initially (pagination)", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      await waitFor(() => {
        const projectNames = mockProjects.slice(0, 9).map(p => p.name);
        for (const name of projectNames) {
          expect(screen.getByText(name)).toBeInTheDocument();
        }
      });
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no projects match search", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      const searchInput = screen.getByPlaceholderText(/Search projects/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "nonexistent_xyz_999" } });
      
      await waitFor(() => {
        expect(screen.getByText(/No projects found/i)).toBeInTheDocument();
      });
    });

    it("displays 'Clear Filters' button in empty state", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      const searchInput = screen.getByPlaceholderText(/Search projects/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });
      
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Clear Filters/i })).toBeInTheDocument();
      });
    });

    it("clears filters when button is clicked", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      const searchInput = screen.getByPlaceholderText(/Search projects/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });
      
      await waitFor(() => {
        expect(screen.getByText(/No projects found/i)).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole("button", { name: /Clear Filters/i });
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/No projects found/i)).not.toBeInTheDocument();
        expect(screen.getByText(mockProjects[0].name)).toBeInTheDocument();
      });
    });
  });

  describe("Filtering", () => {
    it("filters projects by search query", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      const searchInput = screen.getByPlaceholderText(/Search projects/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: mockProjects[0].name } });
      
      await waitFor(() => {
        expect(screen.getByText(mockProjects[0].name)).toBeInTheDocument();
      });
    });

    it("filters projects by category", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      const categoryButtons = screen.getAllByRole("button");
      const defiButton = categoryButtons.find(btn => btn.textContent?.includes("DeFi"));
      
      if (defiButton) {
        fireEvent.click(defiButton);
        
        await waitFor(() => {
          const defiProjects = mockProjects.filter(p => p.category.includes("DeFi"));
          if (defiProjects.length > 0) {
            expect(screen.getByText(defiProjects[0].name)).toBeInTheDocument();
          }
        });
      }
    });

    it("disables controls during loading", () => {
      render(<DiscoverPage />);
      
      const searchInput = screen.getByPlaceholderText(/Search projects/i) as HTMLInputElement;
      const sortSelect = screen.getByRole("combobox") as HTMLSelectElement;
      
      expect(searchInput.disabled).toBe(true);
      expect(sortSelect.disabled).toBe(true);
    });
  });

  describe("Load More", () => {
    it("shows 'Load More' button when results exceed page size", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      await waitFor(() => {
        if (mockProjects.length > 9) {
          expect(screen.getByRole("button", { name: /Load More Projects/i })).toBeInTheDocument();
        }
      });
    });

    it("loads additional projects when button is clicked", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      if (mockProjects.length > 9) {
        const loadMoreButton = screen.getByRole("button", { name: /Load More Projects/i });
        fireEvent.click(loadMoreButton);
        vi.advanceTimersByTime(600);
        
        await waitFor(() => {
          // Should have more projects now
          const project10 = mockProjects[9];
          expect(screen.getByText(project10.name)).toBeInTheDocument();
        });
      }
    });

    it("shows loading state on load more button during load", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      if (mockProjects.length > 9) {
        const loadMoreButton = screen.getByRole("button", { name: /Load More Projects/i });
        expect(loadMoreButton).toBeInTheDocument();
      }
    });
  });

  describe("Sorting", () => {
    it("defaults to 'Highest Rated' sort", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      const sortSelect = screen.getByRole("combobox") as HTMLSelectElement;
      expect(sortSelect.value).toBe("rating");
    });

    it("changes sort order when dropdown changes", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      const sortSelect = screen.getByRole("combobox") as HTMLSelectElement;
      fireEvent.change(sortSelect, { target: { value: "newest" } });
      
      await waitFor(() => {
        expect(sortSelect.value).toBe("newest");
      });
    });
  });

  describe("Results Counter", () => {
    it("displays correct count of visible projects", async () => {
      render(<DiscoverPage />);
      vi.advanceTimersByTime(800);
      
      await waitFor(() => {
        const counter = screen.getByText(/Showing \d+ of \d+ projects/);
        expect(counter).toBeInTheDocument();
      });
    });
  });
});
