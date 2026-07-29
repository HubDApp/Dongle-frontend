import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ConfirmDialogProvider,
  useConfirm,
} from "@/hooks/useConfirm";

function ConfirmHarness({
  onResult,
}: {
  onResult: (value: boolean) => void;
}) {
  const confirm = useConfirm();

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: "Delete review",
          description: "Are you sure you want to delete this review?",
          confirmLabel: "Delete",
          cancelLabel: "Keep review",
          variant: "danger",
        });
        onResult(ok);
      }}
    >
      Open confirm
    </button>
  );
}

describe("ConfirmDialog", () => {
  it("exposes accessible dialog name and description", () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete review"
        description="This cannot be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(
      screen.getByRole("alertdialog", { name: "Delete review" }),
    ).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm is clicked", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen
        title="Delete review"
        description="Confirm deletion"
        confirmLabel="Delete"
        cancelLabel="Keep review"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when cancel is clicked", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen
        title="Delete review"
        description="Confirm deletion"
        confirmLabel="Delete"
        cancelLabel="Keep review"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Keep review" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels on Escape without mocking window.confirm", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen
        title="Delete review"
        description="Confirm deletion"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("useConfirm + ConfirmDialogProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves true on confirm and false on cancel", async () => {
    const onResult = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialogProvider>
        <ConfirmHarness onResult={onResult} />
      </ConfirmDialogProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Open confirm" }));
    expect(
      await screen.findByRole("alertdialog", { name: "Delete review" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));

    onResult.mockClear();
    await user.click(screen.getByRole("button", { name: "Open confirm" }));
    await user.click(screen.getByRole("button", { name: "Keep review" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("does not rely on window.confirm when provider is mounted", async () => {
    const windowConfirm = vi.spyOn(window, "confirm");
    const onResult = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialogProvider>
        <ConfirmHarness onResult={onResult} />
      </ConfirmDialogProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Open confirm" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(windowConfirm).not.toHaveBeenCalled();
  });
});
