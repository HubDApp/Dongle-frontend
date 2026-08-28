/**
 * Browser / network connectivity monitor shared by the data client and React hooks.
 *
 * Combines navigator.onLine with window online/offline events. Optional ping
 * checks live in useOnlineStatus so this module stays framework-free.
 */

type Listener = (online: boolean) => void;

let currentOnline =
  typeof navigator !== "undefined" ? navigator.onLine : true;
const listeners = new Set<Listener>();
let started = false;

function notify(): void {
  for (const listener of listeners) {
    try {
      listener(currentOnline);
    } catch {
      /* isolate listener failures */
    }
  }
}

function handleOnline(): void {
  if (currentOnline) return;
  currentOnline = true;
  notify();
}

function handleOffline(): void {
  if (!currentOnline) return;
  currentOnline = false;
  notify();
}

export function isOnline(): boolean {
  return currentOnline;
}

/**
 * Force online/offline (tests, ping results). No-ops when the value is unchanged.
 */
export function setOnline(next: boolean): void {
  if (currentOnline === next) return;
  currentOnline = next;
  notify();
}

export function subscribeConnectivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startConnectivityMonitor(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  currentOnline = navigator.onLine;
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

export function stopConnectivityMonitor(): void {
  if (!started || typeof window === "undefined") return;
  started = false;
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
}

export function resetConnectivityForTests(online = true): void {
  currentOnline = online;
  listeners.clear();
  stopConnectivityMonitor();
}
