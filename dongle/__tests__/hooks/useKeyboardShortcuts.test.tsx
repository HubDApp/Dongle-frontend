import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

/** Dispatch a global keydown, mirroring how the shortcuts hook listens. */
function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  mocks.push.mockReset();
  document.body.innerHTML = "";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("useKeyboardShortcuts", () => {
  it("'/' focuses search and prevents the browser default", () => {
    const onFocusSearch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onFocusSearch }));

    const event = press("/");

    expect(onFocusSearch).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Cmd/Ctrl+K focuses an existing search field instead of opening the palette", () => {
    const search = document.createElement("input");
    search.type = "search";
    document.body.appendChild(search);
    const onFocusSearch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onFocusSearch }));

    const event = press("k", { metaKey: true });

    expect(onFocusSearch).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Cmd/Ctrl+K leaves the shortcut to the command palette when no search field exists", () => {
    const onFocusSearch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onFocusSearch }));

    const event = press("k", { ctrlKey: true });

    expect(onFocusSearch).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("Cmd/Ctrl+B opens bookmarks", () => {
    const onToggleBookmarks = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleBookmarks }));

    const event = press("b", { metaKey: true });

    expect(onToggleBookmarks).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("C toggles the comparison tray", () => {
    const onToggleComparison = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleComparison }));

    press("c");

    expect(onToggleComparison).toHaveBeenCalledTimes(1);
  });

  it("? opens the help modal and Esc closes modal/drawer", () => {
    const onShowHelp = vi.fn();
    const onClose = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onShowHelp, onClose }));

    const help = press("?");
    press("Escape");

    expect(onShowHelp).toHaveBeenCalledTimes(1);
    expect(help.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("N navigates to the new project form when authenticated", () => {
    renderHook(() => useKeyboardShortcuts({ isAuthenticated: true }));

    press("n");
    expect(mocks.push).toHaveBeenCalledWith("/projects/new");

    mocks.push.mockReset();
    press("N");
    expect(mocks.push).toHaveBeenCalledWith("/projects/new");
  });

  it("ignores N when unauthenticated", () => {
    renderHook(() => useKeyboardShortcuts({ isAuthenticated: false }));

    press("n");

    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("suppresses single-key and Cmd shortcuts while typing in an input", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const onToggleComparison = vi.fn();
    const onToggleBookmarks = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleComparison, onToggleBookmarks }));

    fireEvent.keyDown(input, { key: "c" });
    fireEvent.keyDown(input, { key: "b", metaKey: true });

    expect(onToggleComparison).not.toHaveBeenCalled();
    expect(onToggleBookmarks).not.toHaveBeenCalled();
  });
});
