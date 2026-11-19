import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, renderHook, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

describe("useIntersectionObserver", () => {
  let callback: IntersectionObserverCallback;
  const observe = vi.fn();
  const disconnect = vi.fn();

  beforeEach(() => {
    observe.mockClear();
    disconnect.mockClear();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(function (this: unknown, cb: IntersectionObserverCallback) {
        callback = cb;
        return { observe, disconnect, unobserve: vi.fn(), takeRecords: vi.fn() };
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  const fire = (isIntersecting: boolean) =>
    act(() => callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));

  it("tracks viewport entry and exit when triggerOnce is false", () => {
    const { result } = renderHook(() => useIntersectionObserver<HTMLDivElement>({ triggerOnce: false }));
    const setRef = result.current.ref as unknown as (node: HTMLDivElement | null) => void;
    const node = document.createElement("div");
    act(() => setRef(node));

    expect(observe).toHaveBeenCalledWith(node);
    fire(true);
    expect(result.current.isIntersecting).toBe(true);
    fire(false);
    expect(result.current.isIntersecting).toBe(false);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("stops observing after the first entry by default", () => {
    const { result } = renderHook(() => useIntersectionObserver<HTMLDivElement>());
    act(() => (result.current.ref as unknown as (n: HTMLDivElement) => void)(document.createElement("div")));
    fire(true);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("disconnects on unmount", () => {
    const { result, unmount } = renderHook(() => useIntersectionObserver<HTMLDivElement>({ triggerOnce: false }));
    act(() => (result.current.ref as unknown as (n: HTMLDivElement) => void)(document.createElement("div")));
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});

describe("useModalFocusTrap", () => {
  const offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom has no layout, so give every element a parent to count as visible.
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return this.parentNode;
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (offsetParent) Object.defineProperty(HTMLElement.prototype, "offsetParent", offsetParent);
  });

  function Dialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useModalFocusTrap(isOpen, ref, undefined, onClose);
    return (
      <div ref={ref} role="dialog" tabIndex={-1}>
        <button>first</button>
        <button>last</button>
      </div>
    );
  }

  it("focuses the first element, wraps Tab and closes on Escape", () => {
    const onClose = vi.fn();
    const { getByText } = render(<Dialog isOpen onClose={onClose} />);
    act(() => vi.runAllTimers());
    expect(document.activeElement).toBe(getByText("first"));

    getByText("last").focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(getByText("first"));

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(getByText("last"));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pulls focus back when it moves outside the dialog", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const { getByText } = render(<Dialog isOpen onClose={vi.fn()} />);
    act(() => vi.runAllTimers());

    act(() => outside.focus());
    act(() => vi.runAllTimers());
    expect(document.activeElement).toBe(getByText("first"));
    outside.remove();
  });

  it("restores focus to the trigger and removes listeners on unmount", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const { unmount } = render(<Dialog isOpen onClose={onClose} />);
    unmount();

    expect(document.activeElement).toBe(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    trigger.remove();
  });
});

describe("useOnlineStatus", () => {
  const setOnline = (value: boolean) =>
    Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });

  afterEach(() => {
    setOnline(true);
    vi.unstubAllGlobals();
  });

  it("follows offline and online events and flags the reconnect", () => {
    setOnline(true);
    const onOffline = vi.fn();
    const onOnline = vi.fn();
    const { result } = renderHook(() => useOnlineStatus({ onOffline, onOnline }));
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);
    expect(onOffline).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it("starts offline when navigator.onLine is false", () => {
    setOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it("marks offline when the connectivity ping fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { result } = renderHook(() => useOnlineStatus({ pingUrl: "/api/health" }));
    await act(async () => {
      await result.current.checkConnectivity();
    });
    expect(result.current.isOnline).toBe(false);
    expect(result.current.lastCheck).toBeInstanceOf(Date);
  });

  it("removes listeners on unmount", () => {
    const onOffline = vi.fn();
    const { unmount } = renderHook(() => useOnlineStatus({ onOffline }));
    unmount();
    window.dispatchEvent(new Event("offline"));
    expect(onOffline).not.toHaveBeenCalled();
  });
});
