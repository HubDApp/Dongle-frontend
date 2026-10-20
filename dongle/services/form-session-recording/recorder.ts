/**
 * Session recorder + playback for form interactions.
 */

import { DEFAULT_CONFIG, STORAGE_KEY, createConfig } from "./config";
import {
  getConsent,
  isPasswordInput,
  isSensitiveField,
  maskValue,
  setConsent,
} from "./privacy";
import type {
  FormSessionRecording,
  PlaybackFrame,
  SessionEvent,
  SessionRecordingConfig,
} from "./types";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return `r${Date.now().toString(36)}`;
}

function fieldIdFromTarget(target: EventTarget | null): string | undefined {
  if (!(target instanceof HTMLElement)) return undefined;
  const el =
    target.closest<HTMLElement>("[name],[id],[data-field]") ?? target;
  return (
    el.getAttribute("data-field") ||
    el.getAttribute("name") ||
    el.id ||
    undefined
  );
}

function loadStored(): FormSessionRecording[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FormSessionRecording[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStored(
  sessions: FormSessionRecording[],
  max: number,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-max)));
  } catch {
    /* ignore */
  }
}

export class SessionRecorder {
  private config: SessionRecordingConfig;
  private formId: string;
  private formType: string;
  private recording: FormSessionRecording | null = null;
  private formEl: HTMLElement | null = null;
  private attached = false;

  private onFocus = (e: FocusEvent) => this.pushFromDom(e, "focus");
  private onBlur = (e: FocusEvent) => this.pushFromDom(e, "blur");
  private onInput = (e: Event) => this.pushFromDom(e, "input");
  private onChange = (e: Event) => this.pushFromDom(e, "change");
  private onClick = (e: MouseEvent) => this.pushFromDom(e, "click");
  private onSubmit = (e: Event) => this.pushFromDom(e, "submit");
  private onScroll = () => {
    if (!this.recording) return;
    this.pushEvent({
      type: "scroll",
      timestamp: Date.now(),
      meta: {
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      },
    });
  };

  constructor(
    formId: string,
    formType: string,
    config: Partial<SessionRecordingConfig> = {},
  ) {
    this.config = createConfig(config);
    this.formId = formId;
    this.formType = formType;
  }

  /** Whether recording is allowed right now. */
  isAllowed(): boolean {
    if (!this.config.enabled) return false;
    if (!this.config.requireConsent) return true;
    return getConsent() === true;
  }

  /** User opt-in / opt-out. Disabling clears stored recordings. */
  setUserConsent(allowed: boolean): void {
    setConsent(allowed);
    if (!allowed && this.recording) {
      this.pushEvent({ type: "consent_denied", timestamp: Date.now() });
      this.stop();
    }
  }

  start(): FormSessionRecording | null {
    if (!this.isAllowed()) return null;
    if (this.recording && this.recording.endedAt == null) return this.recording;

    this.recording = {
      id: createId(),
      formId: this.formId,
      formType: this.formType,
      startedAt: Date.now(),
      endedAt: null,
      events: [],
      consented: true,
      durationMs: 0,
    };
    this.pushEvent({ type: "session_start", timestamp: Date.now() });
    return this.recording;
  }

  attach(formEl: HTMLElement): void {
    if (this.attached) return;
    this.formEl = formEl;
    if (!this.isAllowed()) return;

    this.start();
    formEl.addEventListener("focusin", this.onFocus, true);
    formEl.addEventListener("focusout", this.onBlur, true);
    formEl.addEventListener("input", this.onInput, true);
    formEl.addEventListener("change", this.onChange, true);
    formEl.addEventListener("click", this.onClick, true);
    formEl.addEventListener("submit", this.onSubmit, true);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    this.attached = true;
  }

  detach(): void {
    if (!this.formEl || !this.attached) return;
    this.formEl.removeEventListener("focusin", this.onFocus, true);
    this.formEl.removeEventListener("focusout", this.onBlur, true);
    this.formEl.removeEventListener("input", this.onInput, true);
    this.formEl.removeEventListener("change", this.onChange, true);
    this.formEl.removeEventListener("click", this.onClick, true);
    this.formEl.removeEventListener("submit", this.onSubmit, true);
    window.removeEventListener("scroll", this.onScroll);
    this.attached = false;
  }

  private pushFromDom(
    e: Event,
    type: SessionEvent["type"],
  ): void {
    if (!this.isAllowed() || !this.recording) return;
    const target = e.target;
    const fieldId = fieldIdFromTarget(target);
    let valuePreview: string | undefined;

    if (
      (type === "input" || type === "change") &&
      (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement)
    ) {
      const el = target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      valuePreview = maskValue(el.value, fieldId, el, this.config);
      // Never record keystroke-level password content
      if (isPasswordInput(el) || isSensitiveField(fieldId, this.config)) {
        valuePreview = "••••••••";
      }
    }

    this.pushEvent({
      type,
      timestamp: Date.now(),
      fieldId,
      valuePreview,
      meta:
        type === "click" && e instanceof MouseEvent
          ? { button: e.button }
          : undefined,
    });
  }

  pushEvent(event: SessionEvent): void {
    if (!this.recording) return;
    if (this.recording.events.length >= this.config.maxEvents) return;
    this.recording.events.push(event);
  }

  stop(): FormSessionRecording | null {
    if (!this.recording) return null;
    this.detach();
    this.pushEvent({ type: "session_end", timestamp: Date.now() });
    this.recording.endedAt = Date.now();
    this.recording.durationMs =
      this.recording.endedAt - this.recording.startedAt;

    if (this.config.persistLocally && this.isAllowed()) {
      const all = loadStored();
      all.push(this.recording);
      saveStored(all, this.config.maxStoredSessions);
    }

    const done = this.recording;
    this.recording = null;
    return done;
  }

  getCurrent(): FormSessionRecording | null {
    return this.recording;
  }
}

/** Build playback frames for a recording (scrubbable timeline). */
export function buildPlayback(recording: FormSessionRecording): PlaybackFrame[] {
  const start = recording.startedAt;
  const end = recording.endedAt ?? recording.events.at(-1)?.timestamp ?? start;
  const duration = Math.max(1, end - start);

  return recording.events.map((event, index) => ({
    index,
    event,
    elapsedMs: event.timestamp - start,
    progress: (event.timestamp - start) / duration,
  }));
}

export function getStoredRecordings(formId?: string): FormSessionRecording[] {
  const all = loadStored();
  return formId ? all.filter((r) => r.formId === formId) : all;
}

export function getRecordingById(id: string): FormSessionRecording | null {
  return loadStored().find((r) => r.id === id) ?? null;
}

export function deleteRecording(id: string): void {
  const next = loadStored().filter((r) => r.id !== id);
  saveStored(next, DEFAULT_CONFIG.maxStoredSessions);
}

export function clearAllRecordings(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Play recording events with a callback at approximate real-time pacing.
 * Returns a cancel function.
 */
export function playRecording(
  recording: FormSessionRecording,
  onFrame: (frame: PlaybackFrame) => void,
  options: { speed?: number } = {},
): () => void {
  const frames = buildPlayback(recording);
  const speed = options.speed && options.speed > 0 ? options.speed : 1;
  let cancelled = false;
  let timeoutIds: ReturnType<typeof setTimeout>[] = [];

  for (const frame of frames) {
    const delay = frame.elapsedMs / speed;
    const id = setTimeout(() => {
      if (!cancelled) onFrame(frame);
    }, delay);
    timeoutIds.push(id);
  }

  return () => {
    cancelled = true;
    for (const id of timeoutIds) clearTimeout(id);
    timeoutIds = [];
  };
}
