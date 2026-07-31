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
  getReviewPersistenceLabel: vi.fn(() => "local"),
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
    isProjectSaved: () => false,
    toggleSavedProject: vi.fn(),
    canManageSavedProjects: true,
    savedProjectIds: [],
  }),
}));

vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: vi.fn(),
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

vi.mock("@/components/projects/ReportProjectModal", () => ({
  ReportProjectModal: () => null,
}));

vi.mock("@/components/reviews/ReportReviewModal", () => ({
  ReportReviewModal: () => null,
}));

vi.mock("@/services/review/review-report.service", () => ({
  reviewReportService: {
    createReport: vi.fn(() => ({ success: true })),
  },
}));

vi.mock("@/components/verify/VerificationStatus", () => ({
  default: () => null,
}));

vi.mock("@/components/projects/RepositoryMetadata", () => ({
  RepositoryMetadata: () => null,
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

  // ─── VERIFIED ───────────────────────────────────────────────────────────────

  it("shows no warning banner and bypasses safety interstitial for VERIFIED projects", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("VERIFIED");
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    // No warning banners
    expect(screen.queryByText(/Unverified Project/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Verification Pending/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/High Risk Warning/i)).not.toBeInTheDocument();

    // Clicking a link bypasses the interstitial entirely
    fireEvent.click(screen.getByRole("link", { name: /Website/i }));

    expect(confirmMock).not.toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://secure-test.xyz",
      "_blank",
      "noopener,noreferrer",
    );

    windowOpenSpy.mockRestore();
  });

  // ─── NONE ───────────────────────────────────────────────────────────────────

  it("shows amber 'Unverified Project' banner and triggers interstitial for NONE status", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("NONE");
    confirmMock.mockResolvedValue(true);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    // Correct banner heading is visible
    expect(screen.getByText("Unverified Project")).toBeInTheDocument();
    // No pending or rejected banners
    expect(screen.queryByText(/Verification Pending/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/High Risk Warning/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /Website/i }));

    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        "https://secure-test.xyz",
        "_blank",
        "noopener,noreferrer",
      );
    });

    windowOpenSpy.mockRestore();
  });

  it("does NOT open the link when the user cancels the NONE-status interstitial", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("NONE");
    confirmMock.mockResolvedValue(false);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    fireEvent.click(screen.getByRole("link", { name: /Website/i }));
    expect(confirmMock).toHaveBeenCalled();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  // ─── PENDING ────────────────────────────────────────────────────────────────

  it("shows amber 'Verification Pending' banner and triggers interstitial for PENDING status", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("PENDING");
    confirmMock.mockResolvedValue(true);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    // Correct banner heading for PENDING
    expect(screen.getByText("Verification Pending")).toBeInTheDocument();
    // No other banners
    expect(screen.queryByText("Unverified Project")).not.toBeInTheDocument();
    expect(screen.queryByText(/High Risk Warning/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /Website/i }));

    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        "https://secure-test.xyz",
        "_blank",
        "noopener,noreferrer",
      );
    });

    windowOpenSpy.mockRestore();
  });

  it("does NOT open the link when the user cancels the PENDING-status interstitial", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("PENDING");
    confirmMock.mockResolvedValue(false);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    fireEvent.click(screen.getByRole("link", { name: /Website/i }));
    expect(confirmMock).toHaveBeenCalled();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  // ─── REJECTED ───────────────────────────────────────────────────────────────

  it("shows red 'High Risk Warning' banner and triggers interstitial for REJECTED status", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("REJECTED");
    confirmMock.mockResolvedValue(true);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    // Correct banner heading for REJECTED
    expect(screen.getByText(/High Risk Warning: Rejected Project/i)).toBeInTheDocument();
    // No other banners
    expect(screen.queryByText("Unverified Project")).not.toBeInTheDocument();
    expect(screen.queryByText(/Verification Pending/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /GitHub/i }));

    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        "https://github.com/secure-test/repo",
        "_blank",
        "noopener,noreferrer",
      );
    });

    windowOpenSpy.mockRestore();
  });

  it("does NOT open the link when the user cancels the REJECTED-status interstitial", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("REJECTED");
    confirmMock.mockResolvedValue(false);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    fireEvent.click(screen.getByRole("link", { name: /GitHub/i }));
    expect(confirmMock).toHaveBeenCalled();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  // ─── Interstitial copy ──────────────────────────────────────────────────────

  it("passes stronger copy to the interstitial for REJECTED status", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("REJECTED");
    confirmMock.mockResolvedValue(false);
    vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    fireEvent.click(screen.getByRole("link", { name: /Website/i }));

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/Rejected/i),
      }),
    );
  });

  it("passes pending-specific copy to the interstitial for PENDING status", async () => {
    vi.mocked(sorobanService.getVerificationStatus).mockResolvedValue("PENDING");
    confirmMock.mockResolvedValue(false);
    vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ProjectDetailPage />);
    await finishInitialLoad();
    vi.useRealTimers();

    fireEvent.click(screen.getByRole("link", { name: /Website/i }));

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/Pending/i),
      }),
    );
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
