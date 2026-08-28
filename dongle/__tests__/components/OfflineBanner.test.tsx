import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OfflineBanner, { OfflineWarning } from "@/components/ui/OfflineBanner";

describe("OfflineBanner", () => {
  it("announces the offline state", () => {
    render(<OfflineBanner isOnline={false} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it("accepts the legacy isOffline prop", () => {
    render(<OfflineBanner isOffline />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows reconnecting status", () => {
    render(<OfflineBanner isOnline syncStatus="reconnecting" />);
    expect(screen.getByRole("status")).toHaveTextContent(/reconnecting/i);
  });

  it("shows syncing status", () => {
    render(<OfflineBanner isOnline syncStatus="syncing" />);
    expect(screen.getByRole("status")).toHaveTextContent(/syncing/i);
  });

  it("shows synced status", () => {
    render(<OfflineBanner isOnline syncStatus="synced" />);
    expect(screen.getByRole("status")).toHaveTextContent(/synced/i);
  });

  it("shows sync failed with a retry action", async () => {
    const onRetry = vi.fn();
    render(<OfflineBanner isOnline syncStatus="failed" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/sync failed/i);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders an inline warning", () => {
    render(<OfflineWarning message="Cannot submit review while offline" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/cannot submit review/i);
  });
});
