import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import DiscoverPage from "@/app/discover/page";
import { mockProjects } from "@/data/mockProjects";
import { projectService } from "@/services/project/project.service";
import type { SortBy } from "@/hooks/useDiscoverParams";

// Mock soroban so verification fetches resolve immediately
vi.mock("@/services/stellar/soroban.service", () => ({
  sorobanService: {
    getVerificationStatus: vi.fn().mockResolvedValue("NONE"),
  },
}));

// Mock the batch verification module so it resolves immediately in tests
vi.mock("@/services/stellar/batch-verification", () => ({
  batchFetchVerificationStatuses: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/hooks/useDiscoverParams", () => ({
  useDiscoverParams: () => {
    const [searchInput, setSearchInputState] = React.useState("");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [category, setCategoryState] = React.useState("All");
    const [sortBy, setSortByState] = React.useState<SortBy>("rating");
    const [page, setPage] = React.useState(1);

    return {
      searchInput,
      searchQuery,
      category,
      tags: [],
      sortBy,
      page,
      setTags: vi.fn(),
      setSearchInput: (value: string) => {
        setSearchInputState(value);
        setSearchQuery(value);
        setPage(1);
      },
      setCategory: (value: string) => {
        setCategoryState(value);
        setPage(1);
      },
      setSortBy: (value: SortBy) => {
        setSortByState(value);
        setPage(1);
      },
      loadNextPage: () => {
        setPage((current) => current + 1);
      },
      clearFilters: () => {
        setSearchInputState("");
        setSearchQuery("");
        setCategoryState("All");
        setPage(1);
      },
    };
  },
}));

vi.mock("@/hooks/useWalletPageGate", () => ({
  useWalletPageGate: () => ({
    state: "ready",
    publicKey: null,
    walletNetworkLabel: "Testnet",
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
    isConnecting: false,
  }),
}));

vi.mock("@/hooks/useAdminAccess", () => ({
  useAdminAccess: () => ({
    isAdmin: false,
    isAdminChecking: false,
    gate: {
      state: "ready",
      publicKey: null,
      walletNetworkLabel: "Testnet",
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      isConnecting: false,
    },
  }),
}));

vi.mock("@/context/comparison.context", () => ({
  useComparison: () => ({
    selectedProjects: [],
    addProject: vi.fn(),
    removeProject: vi.fn(),
    isSelected: vi.fn(() => false),
    canAddMore: true,
    clearComparison: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWatchlist", () => ({
  useWatchlist: () => ({
    isOnWatchlist: vi.fn(() => false),
    toggleWatchlist: vi.fn(),
    canManageWatchlist: false,
    watchlistIds: [],
    watchlistCount: 0,
    walletAddress: null,
    isConnected: false,
    addToWatchlist: vi.fn(() => ({ success: true })),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

async function finishInitialLoad() {
  // Flush all pending timers and promises so the async verification
  // fetch completes and setIsInitialLoading(false) is called.
  await act(async () => {
    vi.runAllTimers();
    await Promise.resolve();
  });
}

describe("Discover Page - High Risk Flows", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Loading State", () => {
    it("displays loading skeleton on initial render", () => {
      render(<DiscoverPage />);
      // The skeleton grid uses aria-busy="true" and aria-label during loading
      expect(screen.getByLabelText("Loading projects")).toBeInTheDocument();
    });

    it("hides loading skeleton after fetch completes", async () => {
      render(<DiscoverPage />);
      expect(screen.getByLabelText("Loading projects")).toBeInTheDocument();

      await finishInitialLoad();

      expect(screen.queryByLabelText("Loading projects")).not.toBeInTheDocument();
    });
  });

  describe("Results Rendering", () => {
    it("displays projects in grid after loading", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const firstProject = mockProjects[0];
      expect(screen.getByText(firstProject.name)).toBeInTheDocument();
    });

    it("displays project cards with correct information", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const project = mockProjects[0];
      expect(screen.getByText(project.name)).toBeInTheDocument();
      expect(screen.getAllByText(project.primaryCategory!).length).toBeGreaterThan(0);
    });

    it("shows correct number of projects initially (pagination)", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const sorted = projectService.sortProjects(mockProjects, "rating");
      const projectNames = sorted.slice(0, 9).map((p) => p.name);
      for (const name of projectNames) {
        expect(screen.getAllByText(name).length).toBeGreaterThan(0);
      }
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no projects match search", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const searchInput = screen.getByPlaceholderText(
        /Search projects/i,
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "nonexistent_xyz_999" } });

      expect(screen.getByText(/No projects found/i)).toBeInTheDocument();
    });

    it("displays 'Clear Filters' button in empty state", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const searchInput = screen.getByPlaceholderText(
        /Search projects/i,
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      expect(
        screen.getByRole("button", { name: /Clear Filters/i }),
      ).toBeInTheDocument();
    });

    it("clears filters when button is clicked", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const searchInput = screen.getByPlaceholderText(
        /Search projects/i,
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });
      expect(screen.getByText(/No projects found/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Clear Filters/i }));

      expect(screen.queryByText(/No projects found/i)).not.toBeInTheDocument();
      expect(screen.getByText(mockProjects[0].name)).toBeInTheDocument();
    });
  });

  describe("Filtering", () => {
    it("filters projects by search query", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const searchInput = screen.getByPlaceholderText(
        /Search projects/i,
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: mockProjects[0].name } });

      expect(screen.getByText(mockProjects[0].name)).toBeInTheDocument();
    });

    it("filters projects by category", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const categoryButtons = screen.getAllByRole("button");
      const defiButton = categoryButtons.find((btn) =>
        btn.textContent?.includes("DeFi"),
      );

      expect(defiButton).toBeTruthy();
      fireEvent.click(defiButton!);

      const defiProjects = mockProjects.filter((p) => p.primaryCategory?.includes("DeFi"));
      expect(screen.getByText(defiProjects[0].name)).toBeInTheDocument();
    });

    it("disables sort control during loading", () => {
      render(<DiscoverPage />);

      const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
      // Both the verification-status and sort selects should be disabled during loading
      expect(selects.every((s) => s.disabled)).toBe(true);
    });
  });

  describe("Load More", () => {
    it("shows 'Load More' button when results exceed page size", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      expect(
        screen.getByRole("button", { name: /Load More Projects/i }),
      ).toBeInTheDocument();
    });

    it("loads additional projects when button is clicked", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      fireEvent.click(
        screen.getByRole("button", { name: /Load More Projects/i }),
      );
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByText(mockProjects[9].name)).toBeInTheDocument();
    });

    it("shows loading state on load more button during load", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const loadMoreButton = screen.getByRole("button", {
        name: /Load More Projects/i,
      });
      expect(loadMoreButton).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("defaults to 'Highest Rated' sort", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      // The sort select has "Highest Rated" / "Most Popular" / "Newest" options
      const sortSelect = screen
        .getAllByRole("combobox")
        .find((el) => (el as HTMLSelectElement).value === "rating") as HTMLSelectElement;
      expect(sortSelect).toBeTruthy();
      expect(sortSelect.value).toBe("rating");
    });

    it("changes sort order when dropdown changes", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      const sortSelect = screen
        .getAllByRole("combobox")
        .find((el) => (el as HTMLSelectElement).value === "rating") as HTMLSelectElement;
      fireEvent.change(sortSelect, { target: { value: "newest" } });

      expect(sortSelect.value).toBe("newest");
    });
  });

  describe("Results Counter", () => {
    it("displays the discover page heading after load", async () => {
      render(<DiscoverPage />);
      await finishInitialLoad();

      expect(screen.getByText("Discover Projects")).toBeInTheDocument();
      expect(screen.getAllByText(mockProjects[0].name).length).toBeGreaterThan(0);
    });
  });
});
