import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import { AuditLogEntry } from "@/types/audit-log";

// AddressDisplay copies to clipboard — mock the browser API to avoid errors
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const BASE_ENTRY: AuditLogEntry = {
  id: "entry-1",
  actor: "GADMIN1234567890ABCDEF",
  action: "verification_approved",
  targetId: "req_1",
  targetLabel: "Lumina DEX",
  timestamp: "2024-03-20T10:00:00Z",
};

function makeEntry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return { ...BASE_ENTRY, ...overrides };
}

describe("AuditLogViewer", () => {
  // ── Empty state ──────────────────────────────────────────────────────────────

  it("shows an empty-state message when there are no entries", () => {
    render(<AuditLogViewer entries={[]} />);

    expect(screen.getByText(/no audit log entries yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/admin actions will appear here/i),
    ).toBeInTheDocument();
  });

  it("does not render the table when there are no entries", () => {
    const { container } = render(<AuditLogViewer entries={[]} />);
    expect(container.querySelector("table")).toBeNull();
  });

  // ── Populated state ──────────────────────────────────────────────────────────

  it("renders the entry count in the header", () => {
    const entries = [BASE_ENTRY, makeEntry({ id: "entry-2", targetLabel: "Orbit NFT" })];
    render(<AuditLogViewer entries={entries} />);

    expect(screen.getByText(/2 entries/i)).toBeInTheDocument();
  });

  it("shows 'read-only' label in the header", () => {
    render(<AuditLogViewer entries={[BASE_ENTRY]} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  it("renders each entry's target label", () => {
    const entries = [
      BASE_ENTRY,
      makeEntry({ id: "e2", targetLabel: "Stellar Stake", action: "verification_rejected" }),
    ];
    render(<AuditLogViewer entries={entries} />);

    expect(screen.getAllByText("Lumina DEX").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stellar Stake").length).toBeGreaterThan(0);
  });

  it("displays a human-readable action label instead of the raw key", () => {
    render(<AuditLogViewer entries={[BASE_ENTRY]} />);

    // "Verification Approved" should appear; "verification_approved" should not
    expect(screen.getAllByText(/verification approved/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("verification_approved")).toBeNull();
  });

  it("renders the reason when provided", () => {
    const entry = makeEntry({ reason: "Project documents check out" });
    render(<AuditLogViewer entries={[entry]} />);

    expect(screen.getAllByText("Project documents check out").length).toBeGreaterThan(0);
  });

  it("renders a dash placeholder when reason is absent", () => {
    // BASE_ENTRY has no reason
    render(<AuditLogViewer entries={[BASE_ENTRY]} />);
    // The em-dash "—" should appear in the table
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  // ── Action badge colours are applied (smoke test) ──────────────────────────

  it.each([
    ["verification_approved" as const, /verification approved/i],
    ["verification_rejected" as const, /verification rejected/i],
    ["fee_updated" as const, /fee updated/i],
    ["report_resolved" as const, /report resolved/i],
    ["report_dismissed" as const, /report dismissed/i],
  ])("renders readable label for action %s", (action, pattern) => {
    render(<AuditLogViewer entries={[makeEntry({ id: action, action })]} />);
    expect(screen.getAllByText(pattern).length).toBeGreaterThan(0);
  });

  // ── No edit/delete controls ──────────────────────────────────────────────────

  it("renders no edit buttons", () => {
    render(<AuditLogViewer entries={[BASE_ENTRY]} />);
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });

  it("renders no delete buttons", () => {
    render(<AuditLogViewer entries={[BASE_ENTRY]} />);
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });
});
