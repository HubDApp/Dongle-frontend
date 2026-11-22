/**
 * Client-side store for pending transactions awaiting confirmation,
 * plus a persisted history of completion notifications.
 */
export const POLL_INTERVAL_MS = 10_000;
export const POLL_TIMEOUT_MS = 5 * 60_000;

const PENDING_KEY = "dongle:pending-txs";
const HISTORY_KEY = "dongle:tx-notification-history";
const SOUND_KEY = "dongle:tx-notification-sound";
const HISTORY_LIMIT = 50;
const CHANGE_EVENT = "dongle:pending-txs-changed";

export interface PendingTransaction {
  hash: string;
  submittedAt: number;
  label?: string;
}

export interface TxNotificationRecord {
  hash: string;
  status: "confirmed" | "failed" | "timeout";
  at: string;
  label?: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function getPendingTransactions(): PendingTransaction[] {
  return typeof window === "undefined" ? [] : read<PendingTransaction[]>(PENDING_KEY, []);
}

export function trackPendingTransaction(hash: string, label?: string): void {
  if (typeof window === "undefined" || !hash) return;
  const list = getPendingTransactions().filter((t) => t.hash !== hash);
  write(PENDING_KEY, [...list, { hash, label, submittedAt: Date.now() }]);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function removePendingTransaction(hash: string): void {
  write(PENDING_KEY, getPendingTransactions().filter((t) => t.hash !== hash));
}

export function onPendingTransactionsChange(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}

export function getTxNotificationHistory(): TxNotificationRecord[] {
  return typeof window === "undefined" ? [] : read<TxNotificationRecord[]>(HISTORY_KEY, []);
}

export function saveTxNotification(record: TxNotificationRecord): void {
  write(HISTORY_KEY, [record, ...getTxNotificationHistory()].slice(0, HISTORY_LIMIT));
}

export function isTxSoundEnabled(): boolean {
  return typeof window !== "undefined" && read<boolean>(SOUND_KEY, false);
}

export function setTxSoundEnabled(enabled: boolean): void {
  write(SOUND_KEY, enabled);
}
