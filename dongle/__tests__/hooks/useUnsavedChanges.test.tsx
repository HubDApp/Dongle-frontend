import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useConfirm } from "@/hooks/useConfirm";
import * as navigation from "next/navigation";

vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: vi.fn(),
}));

function GuardedPage({ isDirty, isSubmitting = false }: { isDirty: boolean; isSubmitting?: boolean }) {
  useUnsavedChanges(isDirty, isSubmitting);
  return (
    <div>
      <a href="/discover">Leave</a>
    </div>
  );
}

describe("useUnsavedChanges", () => {
  const confirmMock = vi.fn();
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useConfirm).mockReturnValue(confirmMock);
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push: pushMock,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof navigation.useRouter>);
  });

  it("warns before tab close when the form is dirty", () => {
    render(<GuardedPage isDirty />);
    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    Object.defineProperty(event, "returnValue", { writable: true, value: undefined });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not warn before tab close when the form is clean or submitting", () => {
    const { unmount } = render(<GuardedPage isDirty={false} />);
    const cleanEvent = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);
    unmount();

    render(<GuardedPage isDirty isSubmitting />);
    const submittingEvent = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(submittingEvent);
    expect(submittingEvent.defaultPrevented).toBe(false);
  });

  it("prompts before in-app navigation and stays when cancelled", async () => {
    confirmMock.mockResolvedValue(false);
    render(<GuardedPage isDirty />);

    fireEvent.click(screen.getByRole("link", { name: "Leave" }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navigates after the user confirms leaving a dirty form", async () => {
    confirmMock.mockResolvedValue(true);
    render(<GuardedPage isDirty />);

    fireEvent.click(screen.getByRole("link", { name: "Leave" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/discover"));
  });

  it("does not intercept navigation when the form is not dirty", () => {
    render(<GuardedPage isDirty={false} />);
    fireEvent.click(screen.getByRole("link", { name: "Leave" }));
    expect(confirmMock).not.toHaveBeenCalled();
  });
});
