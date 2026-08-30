import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationBell from "@/components/notifications/NotificationBell";
import * as notificationContext from "@/context/notification.context";
import type { AppNotification } from "@/types/notification";

const sample: AppNotification = {
  id: "n1",
  recipientAddress: "user-1",
  type: "project_verified",
  title: "Swap has been verified.",
  createdAt: "2026-06-01T00:00:00.000Z",
  read: false,
  projectId: "proj-1",
  projectName: "Swap",
};

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.spyOn(notificationContext, "useNotifications").mockReturnValue({
      items: [sample],
      unread: 1,
      status: "live",
      open: false,
      setOpen: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
    });
  });

  it("shows an unread badge count", () => {
    render(<NotificationBell />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open notifications/i })).toBeInTheDocument();
  });

  it("opens the drawer with translated history", () => {
    const setOpen = vi.fn();
    vi.spyOn(notificationContext, "useNotifications").mockReturnValue({
      items: [sample],
      unread: 1,
      status: "live",
      open: true,
      setOpen,
      markRead: vi.fn(),
      markAllRead: vi.fn(),
    });
    render(<NotificationBell />);
    expect(screen.getByRole("dialog", { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText("Swap has been verified.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /mark all as read/i }));
  });
});
