import React from "react";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContextHelp from "@/components/ui/ContextHelp";
import ProjectGallery from "@/components/projects/ProjectGallery";
import CommandPalette from "@/components/layout/CommandPalette";
import ReviewList from "@/components/reviews/ReviewList";
import { matchesRating, validRating } from "@/lib/review-filters";
import { readPreference, rememberPreference } from "@/lib/ui-preferences";
import { Review } from "@/types/review";

const mocks = vi.hoisted(() => ({ push: vi.fn(), setTheme: vi.fn(), getDiscoverableProjects: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/providers/ThemeProvider", () => ({ useTheme: () => ({ resolvedTheme: "light", setTheme: mocks.setTheme }) }));
vi.mock("@/services/project/project.service", () => ({ projectService: { getDiscoverableProjects: mocks.getDiscoverableProjects } }));
// eslint-disable-next-line @next/next/no-img-element -- A DOM image mock lets jsdom exercise image loading failures.
vi.mock("next/image", () => ({ default: ({ fill: _fill, priority: _priority, alt = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => <img alt={alt} {...props} /> }));
vi.mock("@/components/ui/AddressDisplay", () => ({ default: ({ address }: { address: string }) => <span>{address}</span> }));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  mocks.push.mockReset(); mocks.setTheme.mockReset();
  mocks.getDiscoverableProjects.mockReturnValue([{ id: "real-project", name: "Stellar Exchange" }]);
  // jsdom has no layout; focus trapping otherwise correctly excludes hidden elements.
  vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockImplementation(function (this: HTMLElement) { return this.parentElement; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("shared safe preferences", () => {
  it("validates corrupt and mixed data, deduplicates and bounds history", () => {
    localStorage.setItem("history", "{"); expect(readPreference("history")).toEqual([]);
    localStorage.setItem("history", JSON.stringify([2, "valid", "valid"])); expect(readPreference("history")).toEqual(["valid"]);
    for (let i = 0; i < 30; i++) rememberPreference("history", String(i));
    expect(rememberPreference("history", "29")).toHaveLength(20);
    expect(readPreference("history")[0]).toBe("29");
  });
  it("survives unavailable storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    expect(readPreference("x")).toEqual([]);
    expect(rememberPreference("x", "value")).toEqual(["value"]);
  });
});

describe("global command palette", () => {
  it.each(["ctrlKey", "metaKey"])("opens with %s+K and cancels browser behavior", async modifier => {
    render(<CommandPalette />);
    const event = new KeyboardEvent("keydown", { key: "k", [modifier]: true, bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveFocus());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("searches projects, navigation and actions, navigates by keyboard, persists history and restores focus", async () => {
    render(<CommandPalette />);
    const opener = screen.getByRole("button", { name: /Quick actions/ });
    opener.focus(); fireEvent.click(opener);
    const input = screen.getByRole("combobox");
    await screen.findByRole("option", { name: "Stellar Exchange" });
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Navigate")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "Stelar Exchange" } });
    expect(screen.getByRole("option", { name: "Stellar Exchange" })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "ArrowDown" }); fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.push).toHaveBeenCalledWith("/projects/real-project");
    expect(readPreference("dongle-command-search")).toEqual(["Stelar Exchange"]);
    expect(opener).toHaveFocus();
    fireEvent.click(opener);
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Stellar Exchange");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "revies" } });
    expect(screen.getByRole("option", { name: "Reviews" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzzzzzzzzzzz" } });
    expect(screen.getByRole("status")).toHaveTextContent("No matching commands");
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it.each([["New project", "/projects/new"], ["Compare projects", "/compare"], ["View bookmarks", "/profile"]])("executes %s", async (label, href) => {
    render(<CommandPalette />); fireEvent.click(screen.getByRole("button", { name: /Quick actions/ }));
    fireEvent.click(await screen.findByRole("option", { name: label }));
    expect(mocks.push).toHaveBeenCalledWith(href);
  });
  it("toggles the actual theme and tolerates corrupt history", () => {
    localStorage.setItem("dongle-command-recent", "invalid");
    render(<CommandPalette />); fireEvent.click(screen.getByRole("button", { name: /Quick actions/ }));
    fireEvent.click(screen.getByRole("option", { name: "Toggle theme" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
  });
  it("traps focus, supports Arrow Up and restores the ordinary input that used the global shortcut", async () => {
    render(<><input aria-label="Ordinary input" /><CommandPalette /></>);
    const ordinary = screen.getByRole("textbox", { name: "Ordinary input" });
    ordinary.focus();
    fireEvent.keyDown(ordinary, { key: "k", ctrlKey: true });
    const input = screen.getByRole("combobox");
    await waitFor(() => expect(input).toHaveFocus());
    screen.getByRole("button", { name: "Close quick actions" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByRole("option", { name: "Toggle theme" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
    expect(ordinary).toHaveFocus();
  });
  it("keeps actions available when browser storage is denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    render(<CommandPalette />);
    fireEvent.click(screen.getByRole("button", { name: /Quick actions/ }));
    fireEvent.click(screen.getByRole("option", { name: "Toggle theme" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
  });
});

describe("contextual help", () => {
  it("opens by mouse and keyboard, associates help, closes and persists viewed state", () => {
    const { unmount } = render(<ContextHelp tip="verification" label="verification">Evidence review.</ContextHelp>);
    const icon = screen.getByRole("button", { name: "Help about verification" });
    expect(screen.getByText("What's this?")).toBeInTheDocument();
    fireEvent.mouseEnter(icon);
    expect(screen.getByRole("note")).toHaveTextContent("Evidence review.");
    fireEvent.mouseLeave(icon.parentElement!);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    fireEvent.focus(icon);
    expect(icon).toHaveAttribute("aria-describedby", screen.getByRole("note").id);
    fireEvent.keyDown(icon, { key: "Escape" });
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    fireEvent.click(icon); expect(screen.getByRole("note")).toBeInTheDocument();
    unmount(); render(<ContextHelp tip="verification" label="verification">Evidence review.</ContextHelp>);
    expect(screen.queryByText("What's this?")).not.toBeInTheDocument();
  });
  it("dismisses only the introduction and survives storage failures", () => {
    render(<ContextHelp tip="ipfs" label="IPFS">Content addressed images.</ContextHelp>);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss introduction to IPFS" }));
    expect(screen.queryByText("What's this?")).not.toBeInTheDocument();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    fireEvent.click(screen.getByRole("button", { name: "Help about IPFS" }));
    expect(screen.getByRole("note")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close help about IPFS" }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("project image gallery", () => {
  it("opens at the selected image, navigates, zooms, resets, traps/restores focus and scroll", async () => {
    document.body.style.overflow = "auto";
    render(<ProjectGallery name="Project" images={["/one.png", "/two.png", "/three.png"]} />);
    const opener = screen.getByRole("button", { name: "Open Project image 2" });
    opener.focus(); fireEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    await waitFor(() => expect(screen.getByRole("button", { name: "Close gallery" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Next image" })); expect(screen.getByText("3 / 3")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "ArrowRight" }); expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "ArrowLeft" }); expect(screen.getByText("3 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show image 2" })); expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const image = within(dialog).getByRole("img", { name: "Project image 2" });
    expect(image.parentElement!.parentElement).toHaveStyle({ transform: "translate(0px, 0px) scale(1.5)" });
    fireEvent.click(screen.getByRole("button", { name: "Reset to fit" }));
    expect(image.parentElement!.parentElement).toHaveStyle({ transform: "translate(0px, 0px) scale(1)" });
    const last = screen.getByRole("button", { name: "Show image 3" }); last.focus();
    fireEvent.keyDown(document, { key: "Tab" }); expect(screen.getByRole("button", { name: "Zoom out" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("auto"); expect(opener).toHaveFocus();
  });
  it("closes on backdrop and handles image errors and changed collections", () => {
    const { rerender } = render(<ProjectGallery name="Project" images={["/one.png"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Project image 1" }));
    fireEvent.error(within(screen.getByRole("dialog")).getByRole("img"));
    expect(within(screen.getByRole("dialog")).getByText("Image unavailable")).toBeInTheDocument();
    rerender(<ProjectGallery name="Another" images={["/new.png"]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Another image 1" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("img").closest(".relative.flex")!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("supports pointer swipe, pinch zoom and panning without changing images while zoomed", () => {
    // Pointer events cover mouse, pen and touch; the component captures each pointer.
    vi.stubGlobal("PointerEvent", MouseEvent);
    HTMLElement.prototype.setPointerCapture = vi.fn();
    render(<ProjectGallery name="Project" images={["/one.png", "/two.png"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Project image 1" }));
    const image = within(screen.getByRole("dialog")).getByRole("img", { name: "Project image 1" });
    const surface = image.parentElement!.parentElement!.parentElement!;
    const pointer = (type: string, id: number, x: number, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
      Object.defineProperty(event, "pointerId", { value: id });
      fireEvent(surface, event);
    };
    pointer("pointerdown", 1, 200, 100); pointer("pointerup", 1, 50, 100);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    // The same surface remains mounted when navigating.
    pointer("pointerdown", 1, 100, 100); pointer("pointerdown", 2, 200, 100);
    pointer("pointermove", 2, 300, 100);
    const activeImage = within(screen.getByRole("dialog")).getByRole("img", { name: "Project image 2" });
    expect(activeImage.parentElement!.parentElement).toHaveStyle({ transform: "translate(0px, 0px) scale(2)" });
    pointer("pointerup", 2, 300, 100);
    pointer("pointermove", 1, 125, 110);
    expect(activeImage.parentElement!.parentElement).toHaveStyle({ transform: "translate(25px, 10px) scale(2)" });
    pointer("pointerup", 1, 125, 110);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("review rating ranges", () => {
  const reviews: Review[] = [1, 2, 3, 4, 5].map(rating => ({ id: String(rating), projectId: "p", projectName: "Project", userAddress: `user-${rating}`, rating, comment: `Review ${rating}`, createdAt: "2026-10-01T00:00:00Z" }));
  it.each([["all", [1, 2, 3, 4, 5]], ["5", [5]], ["4-5", [4, 5]], ["3", [3]], ["1-2", [1, 2]], ["1", [1]]])("matches %s without mutating data", (filter, expected) => {
    expect(reviews.filter(r => matchesRating(r.rating, filter as string)).map(r => r.rating)).toEqual(expected);
    expect(reviews).toHaveLength(5);
  });
  it("restores URL state, combines parent sorting/filtering, updates counts, clears and handles history", () => {
    window.history.replaceState(null, "", "/?reviewRating=4-5&lang=es");
    const clear = vi.fn();
    render(<ReviewList reviews={[...reviews].reverse()} currentUserAddress={null} onEdit={vi.fn()} onDelete={vi.fn()} onClearFilters={clear} />);
    const dropdown = screen.getByRole("combobox", { name: "Filter reviews by rating" });
    expect(dropdown).toHaveValue("4-5"); expect(screen.getByRole("status")).toHaveTextContent("2 reviews");
    expect(screen.getAllByText(/Review [45]/).map(e => e.textContent)).toEqual(["Review 5", "Review 4"]);
    fireEvent.change(dropdown, { target: { value: "1" } });
    expect(window.location.search).toContain("reviewRating=1"); expect(window.location.search).toContain("lang=es");
    act(() => { window.history.replaceState(null, "", "/?reviewRating=3&lang=es"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(dropdown).toHaveValue("3"); expect(screen.getByText("Review 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(clear).toHaveBeenCalled(); expect(dropdown).toHaveValue("all"); expect(window.location.search).toBe("?lang=es");
  });
  it("falls back for invalid URL values and renders empty filtered collections", () => {
    expect(validRating("invalid")).toBe("all");
    window.history.replaceState(null, "", "/?reviewRating=bad");
    render(<ReviewList reviews={[reviews[0]]} currentUserAddress={null} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const dropdown = screen.getByRole("combobox"); expect(dropdown).toHaveValue("all");
    fireEvent.change(dropdown, { target: { value: "5" } });
    expect(screen.getByRole("status")).toHaveTextContent("0 reviews");
    expect(screen.getByText(/No reviews match this rating range/)).toBeInTheDocument();
  });
});
