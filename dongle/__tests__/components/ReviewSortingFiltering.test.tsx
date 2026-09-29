import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewsPage from "@/app/reviews/page";
import * as walletContext from "@/context/wallet.context";
import { reviewService } from "@/services/review/review.service";
import { projectService } from "@/services/project/project.service";
import { Review } from "@/types/review";

vi.mock("@/services/review/review.service", () => ({
  reviewService: {
    getReviews: vi.fn(),
    addReview: vi.fn(),
    updateReview: vi.fn(),
    deleteReview: vi.fn(),
    voteHelpful: vi.fn(),
    voteUnhelpful: vi.fn(),
  },
  isReviewPersistenceApi: vi.fn(() => false),
  getReviewPersistenceLabel: vi.fn(() => "localStorage"),
}));

vi.mock("@/services/project/project.service", () => ({
  projectService: {
    getAllProjects: vi.fn(() => [
      { id: "proj-1", name: "Project Alpha", primaryCategory: "DeFi / DEX", tags: [], description: "", rating: 5, reviews: 2, createdAt: "2026-01-01T00:00:00Z" },
      { id: "proj-2", name: "Project Beta", primaryCategory: "Infrastructure", tags: [], description: "", rating: 3, reviews: 1, createdAt: "2026-01-02T00:00:00Z" },
    ]),
    getProjectById: vi.fn(),
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const mockReviews: Review[] = [
  {
    id: "rev-1",
    projectId: "proj-1",
    projectName: "Project Alpha",
    userAddress: "G_USER_A",
    rating: 5,
    comment: "Excellent DeFi app!",
    createdAt: "2026-01-10T10:00:00Z",
    helpfulVotes: ["G_USER_B"],
    unhelpfulVotes: [],
  },
  {
    id: "rev-2",
    projectId: "proj-1",
    projectName: "Project Alpha",
    userAddress: "G_USER_B",
    rating: 2,
    comment: "Needs work.",
    createdAt: "2026-01-15T12:00:00Z",
    helpfulVotes: [],
    unhelpfulVotes: [],
  },
  {
    id: "rev-3",
    projectId: "proj-2",
    projectName: "Project Beta",
    userAddress: "G_USER_A",
    rating: 4,
    comment: "Solid infrastructure tool.",
    createdAt: "2026-01-20T14:00:00Z",
    helpfulVotes: ["G_USER_A", "G_USER_B"],
    unhelpfulVotes: [],
  },
];

function mockWallet(publicKey: string | null = "G_USER_A") {
  vi.spyOn(walletContext, "useWallet").mockReturnValue({
    isConnected: Boolean(publicKey),
    isConnecting: false,
    isFreighterAvailable: true,
    publicKey,
    walletNetwork: publicKey ? "Test SDF Network ; September 2015" : null,
    isCorrectNetwork: Boolean(publicKey),
    walletNetworkLabel: publicKey ? "Testnet" : "Unknown",
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
  });
}

describe("ReviewList Empty State", () => {
  it("renders default empty message when no custom props provided", () => {
    render(
      <ReviewList
        reviews={[]}
        currentUserAddress={null}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("No reviews yet. Be the first to leave one!")).toBeInTheDocument();
  });

  it("renders custom emptyMessage and emptyTitle when provided", () => {
    render(
      <ReviewList
        reviews={[]}
        currentUserAddress={null}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        emptyTitle="No Matching Reviews"
        emptyMessage="No reviews found matching project 'Project Alpha'."
      />
    );
    expect(screen.getByText("No Matching Reviews")).toBeInTheDocument();
    expect(screen.getByText("No reviews found matching project 'Project Alpha'.")).toBeInTheDocument();
  });
});

describe("ReviewsPage Sorting and Filtering Controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reviewService.getReviews).mockResolvedValue(mockReviews);
    mockWallet("G_USER_A");
  });

  async function renderPage() {
    render(<ReviewsPage />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
  }

  it("renders all review sorting and filtering dropdown controls", async () => {
    await renderPage();

    expect(screen.getByRole("combobox", { name: /Filter reviews by project/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Filter reviews by rating/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Filter reviews by user ownership/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Sort reviews/i })).toBeInTheDocument();
  });

  it("filters reviews by project", async () => {
    await renderPage();

    // Default showing all 3 reviews
    expect(screen.getByText("Excellent DeFi app!")).toBeInTheDocument();
    expect(screen.getByText("Needs work.")).toBeInTheDocument();
    expect(screen.getByText("Solid infrastructure tool.")).toBeInTheDocument();

    // Filter by Project Beta (proj-2)
    const projectSelect = screen.getByRole("combobox", { name: /Filter reviews by project/i });
    fireEvent.change(projectSelect, { target: { value: "proj-2" } });

    expect(screen.queryByText("Excellent DeFi app!")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs work.")).not.toBeInTheDocument();
    expect(screen.getByText("Solid infrastructure tool.")).toBeInTheDocument();
  });

  it("filters reviews by rating", async () => {
    await renderPage();

    // Filter by 5 stars
    const ratingSelect = screen.getByRole("combobox", { name: /Filter reviews by rating/i });
    fireEvent.change(ratingSelect, { target: { value: "5" } });

    expect(screen.getByText("Excellent DeFi app!")).toBeInTheDocument();
    expect(screen.queryByText("Needs work.")).not.toBeInTheDocument();
    expect(screen.queryByText("Solid infrastructure tool.")).toBeInTheDocument();
  });

  it("filters user-owned reviews ('My Reviews')", async () => {
    await renderPage();

    // Filter by My Reviews (G_USER_A has rev-1 and rev-3)
    const userSelect = screen.getByRole("combobox", { name: /Filter reviews by user ownership/i });
    fireEvent.change(userSelect, { target: { value: "mine" } });

    expect(screen.getByText("Excellent DeFi app!")).toBeInTheDocument();
    expect(screen.queryByText("Needs work.")).not.toBeInTheDocument();
    expect(screen.getByText("Solid infrastructure tool.")).toBeInTheDocument();
  });

  it("sorts reviews by rating (highest & lowest)", async () => {
    await renderPage();

    const sortSelect = screen.getByRole("combobox", { name: /Sort reviews/i });

    // Highest rating first (5 star, 4 star, 2 star)
    fireEvent.change(sortSelect, { target: { value: "highest" } });
    expect(screen.getByRole("heading", { name: /Highest Rated Reviews/i })).toBeInTheDocument();

    // Lowest rating first (2 star, 4 star, 5 star)
    fireEvent.change(sortSelect, { target: { value: "lowest" } });
    expect(screen.getByRole("heading", { name: /Lowest Rated Reviews/i })).toBeInTheDocument();
  });

  it("sorts reviews by date (oldest & newest)", async () => {
    await renderPage();

    const sortSelect = screen.getByRole("combobox", { name: /Sort reviews/i });

    fireEvent.change(sortSelect, { target: { value: "oldest" } });
    expect(screen.getByRole("heading", { name: /Oldest Reviews/i })).toBeInTheDocument();

    fireEvent.change(sortSelect, { target: { value: "recent" } });
    expect(screen.getByRole("heading", { name: /Recent Activity/i })).toBeInTheDocument();
  });

  it("displays dynamic empty state matching active filters when no reviews match", async () => {
    await renderPage();

    // Select Project Beta and Rating 1 (which has 0 reviews)
    const projectSelect = screen.getByRole("combobox", { name: /Filter reviews by project/i });
    fireEvent.change(projectSelect, { target: { value: "proj-2" } });

    const ratingSelect = screen.getByRole("combobox", { name: /Filter reviews by rating/i });
    fireEvent.change(ratingSelect, { target: { value: "1" } });

    expect(screen.getByText("No Matching Reviews")).toBeInTheDocument();
    expect(screen.getByText(/No reviews found matching project "Project Beta" and 1-star rating/i)).toBeInTheDocument();
  });
});
