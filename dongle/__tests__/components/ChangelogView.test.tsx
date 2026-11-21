import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangelogView from "@/components/changelog/ChangelogView";
import { buildChangelog } from "@/lib/changelog";
import type { ProjectUpdate } from "@/types/update";

const AUTHOR = "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900000ABCDEFGHIJKLMNOPQR";
const updates: ProjectUpdate[] = [
  { id: "a", projectId: "proj-0", type: "Release", title: "Launch", content: "First release", version: "v1.0.0", publishedAt: "2024-01-01T00:00:00Z", authorAddress: AUTHOR },
  { id: "b", projectId: "proj-0", type: "Release", title: "Fix rounding", content: "Patch release", version: "v1.0.1", publishedAt: "2024-02-01T00:00:00Z", authorAddress: AUTHOR },
  { id: "c", projectId: "proj-0", type: "Security Audit", title: "Audit done", content: "No critical issues", publishedAt: "2024-03-01T00:00:00Z", authorAddress: AUTHOR },
];

function renderView(props: Partial<ComponentProps<typeof ChangelogView>> = {}) {
  const onToggleSubscribe = vi.fn();
  render(
    <ChangelogView
      projectId="proj-0"
      projectName="Soroban Swap"
      entries={buildChangelog(updates)}
      isSubscribed={false}
      onToggleSubscribe={onToggleSubscribe}
      {...props}
    />,
  );
  return { onToggleSubscribe };
}

describe("ChangelogView", () => {
  // jsdom has no object URLs; define them so the Markdown export can run.
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:changelog"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
  });
  afterEach(() => vi.restoreAllMocks());

  it("lists entries newest first with date, title, description, author and version badge", () => {
    renderView();
    const items = screen.getAllByRole("article");
    expect(items.map((item) => within(item).getByRole("heading").textContent)).toEqual(["Audit done", "Fix rounding", "Launch"]);
    const fix = items[1];
    expect(within(fix).getByText("v1.0.1")).toBeInTheDocument();
    expect(within(fix).getByText("Bug fix")).toBeInTheDocument();
    expect(within(fix).getByText("Patch release")).toBeInTheDocument();
    expect(within(fix).getByText("Feb 1, 2024")).toHaveAttribute("datetime", "2024-02-01T00:00:00Z");
    expect(within(fix).getByTitle(AUTHOR)).toHaveTextContent("GABC…OPQR");
  });

  it("filters by type and clears the filter", async () => {
    const user = userEvent.setup();
    renderView();
    const security = screen.getByRole("button", { name: "Security (1)" });
    await user.click(security);
    expect(security).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Showing 1 of 3 entries, newest first")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bug fix (1)" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("shows an empty state when a filter matches nothing", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole("button", { name: "Announcement (0)" }));
    expect(screen.getByText("No entries match these filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export Markdown/ })).toBeDisabled();
  });

  it("links to the RSS feed", () => {
    renderView();
    expect(screen.getByRole("link", { name: /RSS feed/ })).toHaveAttribute("href", "/projects/proj-0/changelog/rss");
  });

  it("subscribes and reflects the subscription state", async () => {
    const user = userEvent.setup();
    const { onToggleSubscribe } = renderView();
    await user.click(screen.getByRole("button", { name: /Subscribe to updates/ }));
    expect(onToggleSubscribe).toHaveBeenCalledTimes(1);
  });

  it("offers to unsubscribe when already subscribed", () => {
    renderView({ isSubscribed: true });
    expect(screen.getByRole("button", { name: /Unsubscribe/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("exports the visible entries as a Markdown file", async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderView();
    await user.click(screen.getByRole("button", { name: /Export Markdown/ }));

    const blob = (URL.createObjectURL as unknown as Mock).mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    const text = await blob.text();
    expect(text).toContain("# Soroban Swap changelog");
    expect(text).toContain("## v1.0.1: Fix rounding");
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("soroban-swap-changelog.md");
  });
});
