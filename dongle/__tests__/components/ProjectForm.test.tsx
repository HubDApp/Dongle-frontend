import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectForm from "@/components/projects/ProjectForm";

const { sorobanMocks, projectServiceMock, txHookMocks, txState, draftHookMocks, trackSubmitMock } =
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
      progress: { phase: "idle", message: null, errorMessage: null, retryable: false } as Record<string, unknown>,
    },
    draftHookMocks: {
      useDraft: vi.fn(),
      saveDraft: vi.fn(),
      clearDraft: vi.fn(),
      deleteDraft: vi.fn(),
    },
    trackSubmitMock: vi.fn(),
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

vi.mock("@/lib/analytics", () => ({
  trackProjectSubmit: trackSubmitMock,
}));

const VALID_CONTRACT_ID = "C" + "A".repeat(53) + "B2";

async function fillRequiredFields() {
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText(/project name/i), "Stellar Lend");
  fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "defi" } });
  await user.type(screen.getByLabelText(/description/i), "A lending protocol for Stellar.");
  await user.type(screen.getByLabelText(/project website/i), "https://stellarlend.example");

  return user;
}


function renderForm(props?: Parameters<typeof ProjectForm>[0]) {
  return render(<ProjectForm {...props} />);
}
describe("ProjectForm component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txState.progress = { phase: "idle", message: null, errorMessage: null, retryable: false };
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
    // Default: run() executes the transaction callback immediately.
    txHookMocks.run.mockImplementation(
      async (buildTx: (hooks: unknown) => Promise<unknown>) =>
        buildTx({ onPhaseChange: vi.fn() }),
    );
  });

  it("renders every form field", async () => {
    renderForm();

    expect(await screen.findByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^category$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/project website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/github url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/logo url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/documentation url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/audit report url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bug bounty url/i)).toBeInTheDocument();
    expect(screen.getByText(/contract addresses/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit registration/i })).toBeInTheDocument();
  });

  it("shows validation errors for invalid inputs", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(await screen.findByLabelText(/project name/i), "ab");
    await user.type(screen.getByLabelText(/description/i), "short");
    fireEvent.change(screen.getByLabelText(/project website/i), { target: { value: "not-a-url" } });

    fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

    await waitFor(() => {
      expect(screen.getByText(/project name must be at least 3 characters/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
    expect(sorobanMocks.registerProject).not.toHaveBeenCalled();
  });

  it("rejects an unsupported repository host with a helpful message", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(await screen.findByLabelText(/project name/i), "Stellar Lend");
    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "defi" } });
    await user.type(screen.getByLabelText(/description/i), "A lending protocol for Stellar.");
    await user.type(screen.getByLabelText(/project website/i), "https://stellarlend.example");
    await user.type(screen.getByLabelText(/github url/i), "https://example.com/owner/repo");

    fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

    await waitFor(() => {
      expect(screen.getByText(/unsupported repository host/i)).toBeInTheDocument();
    });
    expect(sorobanMocks.registerProject).not.toHaveBeenCalled();
  });

  it("rejects an invalid Soroban contract ID", async () => {
    renderForm();
    await fillRequiredFields();

    fireEvent.click(await screen.findByRole("button", { name: /add a contract address/i }));
    fireEvent.change(screen.getByLabelText(/^contract address 1$/i), {
      target: { value: "NOT-VALID" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid soroban contract id\. must be 56 characters starting with 'c'/i),
      ).toBeInTheDocument();
    });
    expect(sorobanMocks.registerProject).not.toHaveBeenCalled();
  });

  it("keeps the submit button disabled while a transaction is processing", async () => {
    let releaseTx!: (value?: unknown) => void;
    txHookMocks.run.mockImplementation(
      () => new Promise((resolve) => { releaseTx = resolve; }),
    );

    renderForm();
    const user = await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

    const processing = await screen.findByRole("button", { name: /processing transaction/i });
    expect(processing).toBeDisabled();

    releaseTx({ id: "tx-1" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit registration/i })).not.toBeDisabled();
    });
  });

  it("mocks the Soroban service and verifies the submit call carries normalized form data", async () => {
    renderForm();
    const user = await fillRequiredFields();

    // Add one contract address slot and fill it.
    fireEvent.click(await screen.findByRole("button", { name: /add a contract address/i }));
    fireEvent.change(screen.getByLabelText(/^contract address 1$/i), {
      target: { value: VALID_CONTRACT_ID.toLowerCase() },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });

    const payload = sorobanMocks.registerProject.mock.calls[0][0];
    expect(payload.name).toBe("Stellar Lend");
    expect(payload.category).toBe("DeFi / DEX"); // "defi" mapped to display label
    expect(payload.websiteUrl).toContain("stellarlend.example");
    expect(payload.contractAddresses).toEqual([VALID_CONTRACT_ID]);
    expect(draftHookMocks.clearDraft).toHaveBeenCalled();
  });

  it("warns on duplicate projects and only submits after confirmation", async () => {
    projectServiceMock.getAllProjects.mockReturnValue([
      { id: "existing-1", name: "stellar lend" } as never,
    ]);

    renderForm();
    const user = await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

    expect(await screen.findByText(/possible duplicate detected/i)).toBeInTheDocument();
    expect(sorobanMocks.registerProject).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: /continue anyway/i }));

    await waitFor(() => {
      expect(sorobanMocks.registerProject).toHaveBeenCalledTimes(1);
    });
  });

  it("renders edit mode and routes the submission to updateProject", async () => {
    renderForm({ mode: "edit", projectId: "proj-9" });

    expect(await screen.findByRole("heading", { name: /edit project/i })).toBeInTheDocument();
    const user = await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /update project/i }));

    await waitFor(() => {
      expect(sorobanMocks.updateProject).toHaveBeenCalledTimes(1);
    });
    expect(sorobanMocks.updateProject.mock.calls[0][1]).toMatchObject({ category: "DeFi / DEX" });
    expect(sorobanMocks.registerProject).not.toHaveBeenCalled();
  });

  it("bypasses Soroban when a custom onSubmit handler is provided", async () => {
    const customOnSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit: customOnSubmit });

    const user = await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

    await waitFor(() => {
      expect(customOnSubmit).toHaveBeenCalledTimes(1);
    });
    expect(customOnSubmit.mock.calls[0][0]).toMatchObject({
      name: "Stellar Lend",
      primaryCategory: "defi",
      domain: "stellarlend.example",
    });
    expect(sorobanMocks.registerProject).not.toHaveBeenCalled();
  });

  it("restores a saved draft and shows the restoration notice", async () => {
    draftHookMocks.useDraft.mockReturnValue({
      hasDraft: true,
      lastSaved: Date.now(),
      loadedDraft: {
        name: "Draft Project",
        primaryCategory: "",
        tags: [],
        description: "",
        websiteUrl: "",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
        auditReportUrl: "",
        bugBountyUrl: "",
        contractAddresses: [],
      },
      saveDraft: draftHookMocks.saveDraft,
      clearDraft: draftHookMocks.clearDraft,
      deleteDraft: draftHookMocks.deleteDraft,
    });

    renderForm();

    expect(
      await screen.findByText(/your previous draft has been restored/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/project name/i)).toHaveValue("Draft Project");
  });

  it("discards a saved draft after confirmation and clears the form", async () => {
    draftHookMocks.useDraft.mockReturnValue({
      hasDraft: true,
      lastSaved: new Date().toISOString(),
      loadedDraft: null,
      saveDraft: draftHookMocks.saveDraft,
      clearDraft: draftHookMocks.clearDraft,
      deleteDraft: draftHookMocks.deleteDraft,
    });

    const { within } = await import("@testing-library/react");
    renderForm();

    fireEvent.click(await screen.findByRole("button", { name: /discard draft/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/discard this draft/i)).toBeInTheDocument();

    // The dialog's confirm button shares its label with the indicator button.
    const confirmButtons = screen.getAllByRole("button", { name: /discard draft/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(draftHookMocks.deleteDraft).toHaveBeenCalled();
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("reports a failed transaction through the analytics hook and recovers the form", async () => {
    txHookMocks.run.mockRejectedValue(new Error("Wallet rejected"));

    renderForm();
    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

    await waitFor(() => {
      expect(trackSubmitMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, mode: "create" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit registration/i })).not.toBeDisabled();
    });
  });

  it("shows the on-chain progress panel during failure and supports retry", async () => {
    txState.progress = {
      phase: "failure",
      message: "Something went wrong during submission",
      errorMessage: "User rejected the transaction",
      retryable: true,
    };

    renderForm();

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/transaction failed/i);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/user rejected the transaction/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(txHookMocks.retry).toHaveBeenCalled();
  });
});
