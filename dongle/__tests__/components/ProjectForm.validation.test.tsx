/**
 * ProjectForm Validation Tests — Issue #495
 *
 * Comprehensive validation tests for the ProjectForm component.
 * Covers:
 *   - Each individual field validation rule
 *   - Required fields and conditional requirements
 *   - URL validation (website, github, logo, docs, audit, bug-bounty)
 *   - Soroban contract address format
 *   - Category-specific dynamic requirements
 *   - Tag deduplication and normalisation
 *
 * Uses the same mock setup as ProjectForm.test.tsx so all module mocks align.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectForm from "@/components/projects/ProjectForm";

// ─── Shared mock infrastructure (mirrors ProjectForm.test.tsx) ────────────────

const { sorobanMocks, projectServiceMock, txHookMocks, txState, draftHookMocks } =
  vi.hoisted(() => ({
    sorobanMocks: {
      registerProject: vi.fn(),
      updateProject: vi.fn(),
    },
    projectServiceMock: {
      getAllProjects: vi.fn(() => []),
    },
    txHookMocks: {
      run: vi.fn(),
      retry: vi.fn(),
    },
    txState: {
      progress: {
        phase: "idle",
        message: null,
        errorMessage: null,
        retryable: false,
      } as Record<string, unknown>,
    },
    draftHookMocks: {
      useDraft: vi.fn(),
      saveDraft: vi.fn(),
      clearDraft: vi.fn(),
      deleteDraft: vi.fn(),
    },
  }));

vi.mock("@/services/stellar/soroban.service", () => ({
  sorobanService: sorobanMocks,
}));
vi.mock("@/services/project/project.service", () => ({
  projectService: projectServiceMock,
}));
vi.mock("@/hooks/useOnChainTransaction", () => ({
  useOnChainTransaction: () => ({
    progress: txState.progress,
    isInProgress: false,
    run: txHookMocks.run,
    retry: txHookMocks.retry,
  }),
}));
vi.mock("@/hooks/useDraft", () => ({
  useDraft: draftHookMocks.useDraft,
}));
vi.mock("@/hooks/useUnsavedChanges", () => ({
  useUnsavedChanges: vi.fn(),
}));
vi.mock("@/context/wallet.context", () => ({
  useWallet: () => ({ publicKey: "GTESTWALLET" }),
}));
vi.mock("@/lib/analytics", () => ({
  trackProjectSubmit: vi.fn(),
  trackFormSubmit: vi.fn(),
  trackFormSubmitSuccess: vi.fn(),
  trackFormSubmitError: vi.fn(),
  trackFormFieldChange: vi.fn(),
  trackFormAbandon: vi.fn(),
  trackFormBackupCreated: vi.fn(),
  trackFormBackupRestored: vi.fn(),
  trackFormBackupFailed: vi.fn(),
  trackFormBackupRetentionCleaned: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_CONTRACT = "C" + "A".repeat(53) + "B2"; // 56 chars, starts with C

function renderForm(props?: Parameters<typeof ProjectForm>[0]) {
  return render(<ProjectForm {...props} />);
}

/** Fills only the required-for-submission fields */
async function fillMinimumValid() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/project name/i), "My Project");
  fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "defi" } });
  await user.type(screen.getByLabelText(/description/i), "A valid description here.");
  await user.type(screen.getByLabelText(/project website/i), "https://myproject.example");
  return user;
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  txState.progress = {
    phase: "idle",
    message: null,
    errorMessage: null,
    retryable: false,
  };
  projectServiceMock.getAllProjects.mockReturnValue([]);
  sorobanMocks.registerProject.mockResolvedValue({ id: "new-project" });
  sorobanMocks.updateProject.mockResolvedValue({ id: "edited" });
  draftHookMocks.useDraft.mockReturnValue({
    hasDraft: false,
    lastSaved: null,
    loadedDraft: null,
    saveDraft: draftHookMocks.saveDraft,
    clearDraft: draftHookMocks.clearDraft,
    deleteDraft: draftHookMocks.deleteDraft,
  });
  txHookMocks.run.mockImplementation(
    async (buildTx: (hooks: unknown) => Promise<unknown>) =>
      buildTx({ onPhaseChange: vi.fn() }),
  );
});

// ─── Required field tests ─────────────────────────────────────────────────────

describe("Required field validation", () => {
  it("shows an error when project name is empty", async () => {
    renderForm();
    await screen.findByLabelText(/project name/i); // wait for render
    submit();
    await waitFor(() => {
      expect(screen.getByText(/project name must be at least 3 characters/i)).toBeInTheDocument();
    });
    expect(sorobanMocks.registerProject).not.toHaveBeenCalled();
  });

  it("shows an error when no category is selected", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/project name/i), "Valid Name");
    await user.type(screen.getByLabelText(/description/i), "A valid description here.");
    await user.type(screen.getByLabelText(/project website/i), "https://example.com");
    submit();
    await waitFor(() => {
      expect(screen.getByText(/please select a category/i)).toBeInTheDocument();
    });
  });

  it("shows an error when description is empty", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/project name/i), "Valid Name");
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "defi" } });
    await user.type(screen.getByLabelText(/project website/i), "https://example.com");
    submit();
    await waitFor(() => {
      expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it("shows an error when website URL is empty", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/project name/i), "Valid Name");
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "defi" } });
    await user.type(screen.getByLabelText(/description/i), "A valid description here.");
    submit();
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
    });
  });
});

// ─── Project name field ───────────────────────────────────────────────────────

describe("Project name field validation", () => {
  it("rejects a name shorter than 3 characters", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/project name/i), "ab");
    submit();
    await waitFor(() => {
      expect(screen.getByText(/project name must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it("accepts a name of exactly 3 characters", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/project name/i), "abc");
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "defi" } });
    await user.type(screen.getByLabelText(/description/i), "A valid description here.");
    await user.type(screen.getByLabelText(/project website/i), "https://example.com");
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
  });

  it("trims whitespace from project name before submission", async () => {
    renderForm();
    const user = await fillMinimumValid();
    fireEvent.change(screen.getByLabelText(/project name/i), {
      target: { value: "  Trimmed Name  " },
    });
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
    expect(sorobanMocks.registerProject.mock.calls[0][0].name).toBe("Trimmed Name");
  });
});

// ─── Description field ────────────────────────────────────────────────────────

describe("Description field validation", () => {
  it("rejects a description shorter than 10 characters", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/project name/i), "Valid Name");
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "defi" } });
    await user.type(screen.getByLabelText(/description/i), "Too short");
    await user.type(screen.getByLabelText(/project website/i), "https://example.com");
    submit();
    await waitFor(() => {
      expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it("rejects a description longer than 500 characters", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/project name/i), "Valid Name");
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "defi" } });
    // 501 characters
    const longDesc = "A".repeat(501);
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: longDesc } });
    await user.type(screen.getByLabelText(/project website/i), "https://example.com");
    submit();
    await waitFor(() => {
      expect(screen.getByText(/description cannot exceed 500 characters/i)).toBeInTheDocument();
    });
  });

  it("accepts a description of exactly 10 characters", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/project name/i), "Valid Name");
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "defi" } });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "1234567890" },
    });
    await user.type(screen.getByLabelText(/project website/i), "https://example.com");
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── URL field validation ─────────────────────────────────────────────────────

describe("Website URL field validation", () => {
  it("rejects a plaintext string without a scheme", async () => {
    renderForm();
    await screen.findByLabelText(/project name/i);
    fireEvent.change(screen.getByLabelText(/project website/i), {
      target: { value: "not-a-url" },
    });
    submit();
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
    });
  });

  it("accepts a URL without a scheme and auto-prepends https://", async () => {
    renderForm();
    const user = await fillMinimumValid();
    // Override website with a bare domain — the form normalises it
    fireEvent.change(screen.getByLabelText(/project website/i), {
      target: { value: "myproject.example" },
    });
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
    expect(sorobanMocks.registerProject.mock.calls[0][0].websiteUrl).toBe(
      "https://myproject.example",
    );
  });

  it("accepts an https:// URL", async () => {
    renderForm();
    await fillMinimumValid();
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
    expect(sorobanMocks.registerProject.mock.calls[0][0].websiteUrl).toBe(
      "https://myproject.example",
    );
  });
});

describe("GitHub / repository URL field validation", () => {
  it("rejects a non-GitHub URL as repository", async () => {
    renderForm();
    const user = await fillMinimumValid();
    await user.type(screen.getByLabelText(/repository url/i), "https://bitbucket.org/owner/repo");
    submit();
    await waitFor(() => {
      expect(screen.getByText(/unsupported repository host/i)).toBeInTheDocument();
    });
  });

  it("accepts a valid GitHub repository URL", async () => {
    renderForm();
    const user = await fillMinimumValid();
    await user.type(screen.getByLabelText(/repository url/i), "https://github.com/stellar/lend");
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
    expect(sorobanMocks.registerProject.mock.calls[0][0].githubUrl).toBe(
      "https://github.com/stellar/lend",
    );
  });

  it("allows the repository URL to be left empty", async () => {
    renderForm();
    await fillMinimumValid();
    // Do not fill githubUrl
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
  });
});

describe("Optional URL fields (logo, docs, audit, bug-bounty)", () => {
  const urlFields: [RegExp, string][] = [
    [/logo url/i, "logoUrl"],
    [/documentation url/i, "docsUrl"],
    [/audit report url/i, "auditReportUrl"],
    [/bug bounty url/i, "bugBountyUrl"],
  ];

  it.each(urlFields)(
    "rejects an invalid URL in the %s field",
    async (labelPattern) => {
      renderForm();
      await screen.findByLabelText(/project name/i);
      fireEvent.change(screen.getByLabelText(labelPattern), {
        target: { value: "not-a-url-$$$$" },
      });
      submit();
      await waitFor(() => {
        expect(screen.getAllByText(/please enter a valid url/i).length).toBeGreaterThan(0);
      });
    },
  );

  it("accepts a valid HTTPS URL in the logo field", async () => {
    renderForm();
    const user = await fillMinimumValid();
    await user.type(screen.getByLabelText(/logo url/i), "https://example.com/logo.png");
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── Contract address field ───────────────────────────────────────────────────

describe("Soroban contract address field validation", () => {
  it("rejects a contract address not starting with C", async () => {
    renderForm();
    await fillMinimumValid();
    fireEvent.click(await screen.findByRole("button", { name: /add a contract address/i }));
    fireEvent.change(screen.getByLabelText(/^contract address 1$/i), {
      target: { value: "G" + "A".repeat(55) },
    });
    submit();
    await waitFor(() => {
      expect(
        screen.getByText(/invalid soroban contract id/i),
      ).toBeInTheDocument();
    });
  });

  it("rejects a contract address shorter than 56 characters", async () => {
    renderForm();
    await fillMinimumValid();
    fireEvent.click(await screen.findByRole("button", { name: /add a contract address/i }));
    fireEvent.change(screen.getByLabelText(/^contract address 1$/i), {
      target: { value: "CSHORT" },
    });
    submit();
    await waitFor(() => {
      expect(screen.getByText(/invalid soroban contract id/i)).toBeInTheDocument();
    });
  });

  it("rejects a contract address that is exactly 56 chars but has invalid characters", async () => {
    renderForm();
    await fillMinimumValid();
    fireEvent.click(await screen.findByRole("button", { name: /add a contract address/i }));
    // Contains '0' and '1' which are not valid base32 chars (A-Z, 2-7)
    const invalidChars = "C" + "0".repeat(55);
    fireEvent.change(screen.getByLabelText(/^contract address 1$/i), {
      target: { value: invalidChars },
    });
    submit();
    await waitFor(() => {
      expect(screen.getByText(/invalid soroban contract id/i)).toBeInTheDocument();
    });
  });

  it("accepts a valid 56-character Soroban contract ID", async () => {
    renderForm();
    await fillMinimumValid();
    fireEvent.click(await screen.findByRole("button", { name: /add a contract address/i }));
    fireEvent.change(screen.getByLabelText(/^contract address 1$/i), {
      target: { value: VALID_CONTRACT },
    });
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
    expect(sorobanMocks.registerProject.mock.calls[0][0].contractAddresses).toContain(
      VALID_CONTRACT,
    );
  });

  it("normalises a lowercase contract ID to uppercase", async () => {
    renderForm();
    await fillMinimumValid();
    fireEvent.click(await screen.findByRole("button", { name: /add a contract address/i }));
    fireEvent.change(screen.getByLabelText(/^contract address 1$/i), {
      target: { value: VALID_CONTRACT.toLowerCase() },
    });
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
    const submitted = sorobanMocks.registerProject.mock.calls[0][0].contractAddresses;
    expect(submitted[0]).toBe(VALID_CONTRACT.toUpperCase());
  });

  it("allows up to 5 contract addresses", async () => {
    renderForm();
    await fillMinimumValid();

    for (let i = 0; i < 5; i++) {
      fireEvent.click(await screen.findByRole("button", { name: /add a contract address/i }));
      const contract = "C" + String(i + 2).repeat(55); // unique 56-char IDs
      fireEvent.change(screen.getByLabelText(new RegExp(`contract address ${i + 1}`, "i")), {
        target: { value: contract },
      });
    }

    // "Add a contract address" button should be disabled after 5
    const addBtn = screen.queryByRole("button", { name: /add a contract address/i });
    // Either disabled or hidden — either is valid
    if (addBtn) {
      expect(addBtn).toBeDisabled();
    } else {
      expect(addBtn).toBeNull();
    }
  });
});

// ─── Category field ───────────────────────────────────────────────────────────

describe("Category field validation", () => {
  it("rejects form submission when no category is chosen", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/project name/i), "Valid Name");
    await user.type(screen.getByLabelText(/description/i), "A valid description here.");
    await user.type(screen.getByLabelText(/project website/i), "https://example.com");
    submit();
    await waitFor(() => {
      expect(screen.getByText(/please select a category/i)).toBeInTheDocument();
    });
    expect(sorobanMocks.registerProject).not.toHaveBeenCalled();
  });

  it("accepts every available category value", async () => {
    const categories = ["defi", "nft", "gaming", "infrastructure", "social", "dao"];
    for (const cat of categories) {
      renderForm();
      await fillMinimumValid();
      fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: cat } });
      submit();
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => {
        expect(sorobanMocks.registerProject).toHaveBeenCalled();
      });
      vi.clearAllMocks();
      projectServiceMock.getAllProjects.mockReturnValue([]);
      sorobanMocks.registerProject.mockResolvedValue({ id: "new-project" });
    }
  });
});

// ─── Tag deduplication ────────────────────────────────────────────────────────

describe("Tags field normalisation", () => {
  it("deduplicates tags before submission", async () => {
    renderForm({ initialData: { tags: [" DeFi ", "defi", "payments"] } });
    await fillMinimumValid();
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
    const tags = sorobanMocks.registerProject.mock.calls[0][0].tags as string[];
    const unique = new Set(tags.map((t: string) => t.toLowerCase()));
    expect(unique.size).toBe(tags.length);
  });
});

// ─── Multiple validation errors shown simultaneously ─────────────────────────

describe("Multiple simultaneous validation errors", () => {
  it("shows errors for all invalid fields at once when submitting a blank form", async () => {
    renderForm();
    await screen.findByLabelText(/project name/i);
    submit();

    await waitFor(() => {
      expect(screen.getByText(/project name must be at least 3 characters/i)).toBeInTheDocument();
    });
    // At minimum, name, description, and website should all show errors
    expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
    expect(sorobanMocks.registerProject).not.toHaveBeenCalled();
  });
});

// ─── Successful submission path ───────────────────────────────────────────────

describe("Successful submission", () => {
  it("calls registerProject with all normalised field values", async () => {
    renderForm();
    const user = await fillMinimumValid();
    await user.type(screen.getByLabelText(/repository url/i), "https://github.com/test/repo");
    submit();
    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
    const payload = sorobanMocks.registerProject.mock.calls[0][0];
    expect(payload.name).toBe("My Project");
    expect(payload.websiteUrl).toBe("https://myproject.example");
    expect(payload.githubUrl).toBe("https://github.com/test/repo");
  });

  it("clears the draft on successful submission", async () => {
    renderForm();
    await fillMinimumValid();
    submit();
    await waitFor(() => {
      expect(draftHookMocks.clearDraft).toHaveBeenCalled();
    });
  });
});
