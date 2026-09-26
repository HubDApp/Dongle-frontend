import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SubmissionCollaborationPanel } from "@/components/projects/SubmissionCollaborationPanel";
import { teamCollaborationService } from "@/services/team/team-collaboration.service";
import { setIdGenerator, resetIdGenerator } from "@/lib/id-generator";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

let idCounter = 0;
function nextId() { return `test-id-${++idCounter}`; }

const SUBMISSION_ID = "sub_123";

describe("SubmissionCollaborationPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    idCounter = 0;
    setIdGenerator(nextId);

    teamCollaborationService.addTeamMember(SUBMISSION_ID, "GOWNER123", {
      addressOrId: "GOWNER123",
      name: "Test Owner",
      role: "owner",
    });
  });

  afterEach(() => {
    localStorage.clear();
    resetIdGenerator();
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<SubmissionCollaborationPanel submissionId={SUBMISSION_ID} submissionName="Test Project" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders tab navigation after loading", async () => {
    render(<SubmissionCollaborationPanel submissionId={SUBMISSION_ID} submissionName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText("Comments")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
      expect(screen.getByText("Views")).toBeInTheDocument();
      expect(screen.getByText("Activity")).toBeInTheDocument();
    });
  });

  it("shows team members in Team tab", async () => {
    render(<SubmissionCollaborationPanel submissionId={SUBMISSION_ID} submissionName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText("Team")).toBeInTheDocument();
    });

    await screen.findByText("Team").click();

    await waitFor(() => {
      expect(screen.getByText("Test Owner")).toBeInTheDocument();
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });
  });

  it("allows owner to add team member", async () => {
    render(<SubmissionCollaborationPanel submissionId={SUBMISSION_ID} submissionName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText("Team")).toBeInTheDocument();
    });

    await screen.findByText("Team").click();
    await screen.findByText("Add Member").click();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Wallet address or email")).toBeInTheDocument();
    });

    screen.getByPlaceholderText("Wallet address or email").value = "GEDITOR123";
    screen.getByPlaceholderText("Wallet address or email").dispatchEvent(new Event("input", { bubbles: true }));

    await screen.findByText("Add").click();

    await waitFor(() => {
      expect(screen.getByText("Editor")).toBeInTheDocument();
    });
  });

  it("allows adding comments in Comments tab", async () => {
    render(<SubmissionCollaborationPanel submissionId={SUBMISSION_ID} submissionName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText("Comments")).toBeInTheDocument();
    });

    await screen.findByText("Add a comment").click();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Write a comment... Use @ to mention team members")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Write a comment... Use @ to mention team members");
    textarea.value = "This is a test comment";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    await screen.findByText("Comment").click();

    await waitFor(() => {
      expect(screen.getByText("This is a test comment")).toBeInTheDocument();
    });
  });

  it("creates shared view in Views tab", async () => {
    render(<SubmissionCollaborationPanel submissionId={SUBMISSION_ID} submissionName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText("Views")).toBeInTheDocument();
    });

    await screen.findByText("Views").click();
    await screen.findByText("Save View").click();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("View name (e.g., 'My Pending Reviews')")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("View name (e.g., 'My Pending Reviews')");
    input.value = "My Test View";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await screen.findByText("Create").click();

    await waitFor(() => {
      expect(screen.getByText("My Test View")).toBeInTheDocument();
    });
  });
});