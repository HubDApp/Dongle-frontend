import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeviceList } from "@/components/backup";
import type { SyncDeviceView } from "@/services/sync/device-sync.service";

const DEVICES: SyncDeviceView[] = [
  {
    deviceId: "dev-current",
    label: "Chrome on Windows",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-01T00:00:00.000Z",
    online: true,
    isCurrent: true,
  },
  {
    deviceId: "dev-other",
    label: "Safari on iPhone",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-02T00:00:00.000Z",
    online: false,
    isCurrent: false,
  },
];

describe("DeviceList", () => {
  it("lists every device and marks the current one", () => {
    render(<DeviceList devices={DEVICES} />);

    expect(screen.getByText("Active devices (2)")).toBeInTheDocument();
    expect(screen.getByText("Chrome on Windows")).toBeInTheDocument();
    expect(screen.getByText("Safari on iPhone")).toBeInTheDocument();
    expect(screen.getByText("This device")).toBeInTheDocument();
    expect(screen.getAllByText(/Last active/)).toHaveLength(2);
  });

  it("reports online/offline presence", () => {
    render(<DeviceList devices={DEVICES} />);
    expect(screen.getByLabelText("Online")).toBeInTheDocument();
    expect(screen.getByLabelText("Offline")).toBeInTheDocument();
  });

  it("invokes the sign-out-others action", () => {
    const onSignOutOthers = vi.fn();
    render(<DeviceList devices={DEVICES} onSignOutOthers={onSignOutOthers} />);

    fireEvent.click(screen.getByRole("button", { name: /sign out all other devices/i }));

    expect(onSignOutOthers).toHaveBeenCalledTimes(1);
  });

  it("disables sign-out when this is the only device", () => {
    render(<DeviceList devices={[DEVICES[0]]} onSignOutOthers={vi.fn()} />);
    expect(screen.getByRole("button", { name: /sign out all other devices/i })).toBeDisabled();
    expect(screen.getByText("There are no other devices signed in.")).toBeInTheDocument();
  });

  it("shows an empty state when nothing is enrolled", () => {
    render(<DeviceList devices={[]} />);
    expect(screen.getByText("No devices enrolled yet.")).toBeInTheDocument();
  });

  it("invokes the refresh action", () => {
    const onRefresh = vi.fn();
    render(<DeviceList devices={DEVICES} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole("button", { name: /refresh device list/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
