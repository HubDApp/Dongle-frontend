import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import ProjectDetailPage from "@/app/projects/[id]/page";
import { projectService } from "@/services/project/project.service";
import { sorobanService } from "@/services/stellar/soroban.service";
import { useConfirm } from "@/hooks/useConfirm";
import { PROJECT_CATEGORIES } from "@/types/project";
import type { ProjectCategory } from "@/types/project";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "test-project-id" }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@/services/project/project.service", () => ({
  projectService: {
    getProjectById: vi.fn(),
  },
}));

vi.mock("@/services/stellar/soroban.service", () => ({
  sorobanService: {
    getVerificationStatus: vi.fn(),
  },
}));

vi.mock("@/services/review/review.service", () => ({
  reviewService: {
    getReviewsByProject: vi.fn(() => Promise.resolve([])),
  },
  getReviewPersistenceLabel: vi.fn(() => "localStorage"),
}));

vi.mock("@/services/review/review-report.service", () => ({
  reviewReportService: {
    createReport: vi.fn(),
  },
}));

vi.mock("@/services/recent-views/recent-views.service", () => ({
  recentViewsService: {
    addView: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackProjectView: vi.fn(),
  trackReviewSubmit: vi.fn(),
}));

vi.mock("@/hooks/useWalletPageGate", () => ({
  useWalletPageGate: () => ({
    state: "ready",
    publicKey: "G_OWNER_123",
    isConnecting: false,
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
    walletNetworkLabel: "Testnet",
  }),
}));

vi.mock("@/hooks/useSavedProjects", () => ({
  useSavedProjects: () => ({
    isProjectSaved: vi.fn(() => false),
    toggleSavedProject: vi.fn(),
    canManageSavedProjects: true,
    savedProjectIds: [],
    walletAddress: "G_OWNER_123",
    isConnected: true,
    clearSavedProjects: vi.fn(),
  }),
}));

vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: vi.fn(),
}));

vi.mock("@/hooks/useSavedProjects", () => ({
  useSavedProjects: () => ({
    isProjectSaved: () => false,
    toggleSavedProject: vi.fn(),
    canManageSavedProjects: true,
    savedProjectIds: [],
  }),
}));

vi.mock("@/services/update/update.service", () => ({
  updateService: {
    getUpdatesByProject: vi.fn(() => []),
    addUpdate: vi.fn(),
    updateUpdate: vi.fn(),
    deleteUpdate: vi.fn(),
  },
}));

vi.mock("@/services/recent-views/recent-views.service", () => ({
  recentViewsService: {
    addView: vi.fn(),
  },
}));

async function finishInitialLoad() {
  await act(async () => {
    vi.advanceTimersByTime(800);
  });
}

describe("Project Detail Page - Verification and Safety Warnings", () => {
  const mockProject = {
    id: "test-project-id",
    name: "Test Secure Project",
    category: PROJECT_CATEGORIES.DEFI,
    primaryCategory: PROJECT_CATEGORIES.DEFI,
    description: "A test project description.",
    rating: 4.8,
    reviews: 5,
    createdAt: "2026-01-01T00:00:00Z",
    websiteUrl: "https://secure-test.xyz",
    githubUrl: "https://github.com/secure-test/repo",
    ownerAddress: "G_OWNER_123",
  };

  const confirmMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(projectService.getProjectById).mockReturnValue(mockProject);
    vi.mocked(useConfirm).mockReturnValue(confirmMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show no warning banner and bypass safety interstitial if project is VERIFIED", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("VERIFIED");
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    // Check warning banners are absent
    expect(screen.queryByText(/Unverified Project Context/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/High Risk Warning: Rejected Project/i)).not.toBeInTheDocument();

    // Trigger website click
    const websiteLink = screen.getByRole("link", { name: /Website/i });
    fireEvent.click(websiteLink);

    // Should bypass interstitial (confirm should not be called)
    expect(confirmMock).not.toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith("https://secure-test.xyz", "_blank", "noopener,noreferrer");

    windowOpenSpy.mockRestore();
  });

  it("should show amber context warning and trigger safety interstitial for unverified projects (NONE status)", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("NONE");
    confirmMock.mockResolvedValue(true);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    // Amber warning banner must be visible
    expect(screen.getByText(/Unverified Project Context/i)).toBeInTheDocument();
    expect(screen.queryByText(/High Risk Warning: Rejected Project/i)).not.toBeInTheDocument();

    // Trigger website click
    const websiteLink = screen.getByRole("link", { name: /Website/i });
    fireEvent.click(websiteLink);

    // Interstitial confirm mock must be called with domain/destination details
    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith("https://secure-test.xyz", "_blank", "noopener,noreferrer");
    });

    windowOpenSpy.mockRestore();
  });

  it("should show stronger red warning for rejected projects and handle safety interstitial cancellation", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("REJECTED");
    confirmMock.mockResolvedValue(false); // User cancels
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    // Red warning banner must be visible
    expect(screen.getByText(/High Risk Warning: Rejected Project/i)).toBeInTheDocument();
    expect(screen.queryByText(/Unverified Project Context/i)).not.toBeInTheDocument();

    // Trigger GitHub link click
    const githubLink = screen.getByRole("link", { name: /GitHub/i });
    fireEvent.click(githubLink);

    expect(confirmMock).toHaveBeenCalled();
    
    // Wait a brief tick to let the promise resolve
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    
    // Since user canceled, window.open should not have been called
    expect(windowOpenSpy).not.toHaveBeenCalled();

    windowOpenSpy.mockRestore();
  });
});

describe("Project Detail Page - layout shell", () => {
  const mockProject = {
    id: "test-project-id",
    name: "Test Secure Project",
    category: PROJECT_CATEGORIES.DEFI as ProjectCategory,
    primaryCategory: PROJECT_CATEGORIES.DEFI as ProjectCategory,
    description: "A test project description.",
    rating: 4.8,
    reviews: 5,
    createdAt: "2026-01-01T00:00:00Z",
    websiteUrl: "https://secure-test.xyz",
    githubUrl: "https://github.com/secure-test/repo",
    ownerAddress: "G_OWNER_123",
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(useConfirm).mockReturnValue(vi.fn());
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("NONE");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not import or render a nested LayoutWrapper", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/projects/[id]/page.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/LayoutWrapper/);
  });

  it("uses the shared page shell spacing while loading", () => {
    vi.mocked(projectService.getProjectById).mockReturnValue(mockProject);
    const { container } = render(<ProjectDetailPage />);

    const shell = container.querySelector("main");
    expect(shell?.className).toMatch(/min-h-screen/);
    expect(shell?.className).toMatch(/pt-32/);
    expect(shell?.className).toMatch(/pb-24/);
    expect(screen.getByText(/Loading project details/i)).toBeInTheDocument();
  });

  it("uses the shared page shell spacing for not-found state", async () => {
    vi.mocked(projectService.getProjectById).mockReturnValue(null);
    render(<ProjectDetailPage />);
    await finishInitialLoad();

    expect(screen.getByText(/Project Not Found/i)).toBeInTheDocument();
    const shell = screen.getByText(/Project Not Found/i).closest("main");
    expect(shell?.className).toMatch(/min-h-screen/);
    expect(shell?.className).toMatch(/pt-32/);
    expect(shell?.className).toMatch(/pb-24/);
  });

  it("uses the shared page shell spacing for the success state", async () => {
    vi.mocked(projectService.getProjectById).mockReturnValue(mockProject);
    render(<ProjectDetailPage />);
    await finishInitialLoad();

    expect(screen.getByRole("heading", { name: mockProject.name })).toBeInTheDocument();
    const shell = screen.getByRole("heading", { name: mockProject.name }).closest("main");
    expect(shell?.className).toMatch(/min-h-screen/);
    expect(shell?.className).toMatch(/pt-32/);
    expect(shell?.className).toMatch(/pb-24/);
  });
});
