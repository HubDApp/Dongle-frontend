/**
 * Client EventSource wrapper with bounded reconnect backoff.
 *
 * EventSource already retries, but a tight failure loop is avoided by
 * closing and waiting with exponential backoff (capped) before opening
 * a new connection.
 */

export type StreamStatus = "idle" | "connecting" | "live" | "reconnecting" | "offline";

export interface NotificationStreamOptions {
  url: string;
  onEvent: (payload: unknown) => void;
  onStatus?: (status: StreamStatus) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  fetchEventSource?: typeof EventSource;
}

const DEFAULT_MAX_RETRIES = 8;
const DEFAULT_BASE_DELAY = 1000;
const DEFAULT_MAX_DELAY = 30_000;

export function createNotificationStream(options: NotificationStreamOptions) {
  const EventSourceImpl = options.fetchEventSource ?? EventSource;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = options.baseDelayMs ?? DEFAULT_BASE_DELAY;
  const maxDelay = options.maxDelayMs ?? DEFAULT_MAX_DELAY;

  let source: EventSource | null = null;
  let retries = 0;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const setStatus = (status: StreamStatus) => options.onStatus?.(status);

  const connect = () => {
    if (closed) return;
    setStatus(retries === 0 ? "connecting" : "reconnecting");
    source = new EventSourceImpl(options.url);

    source.addEventListener("notification", (event: MessageEvent<string>) => {
      retries = 0;
      setStatus("live");
      try {
        const parsed: unknown = JSON.parse(event.data);
        options.onEvent(parsed);
      } catch (error) {
        options.onError?.(
          error instanceof Error ? error : new Error("Malformed notification JSON"),
        );
      }
    });

    source.onopen = () => {
      retries = 0;
      setStatus("live");
    };

    source.onerror = () => {
      source?.close();
      source = null;
      if (closed) return;
      retries += 1;
      if (retries > maxRetries) {
        setStatus("offline");
        options.onError?.(new Error("Notification stream retry budget exhausted"));
        return;
      }
      setStatus("reconnecting");
      const delay = Math.min(maxDelay, baseDelay * 2 ** (retries - 1));
      timer = setTimeout(connect, delay);
    };
  };

  connect();

  return {
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      source?.close();
      source = null;
      setStatus("idle");
    },
  };
}

export function computeReconnectDelay(
  attempt: number,
  baseDelayMs = DEFAULT_BASE_DELAY,
  maxDelayMs = DEFAULT_MAX_DELAY,
): number {
  return Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
}
