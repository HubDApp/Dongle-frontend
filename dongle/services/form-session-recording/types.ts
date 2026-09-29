/**
 * Form session recording types — optional, privacy-respecting playback.
 */

export type SessionEventType =
  | "session_start"
  | "session_end"
  | "focus"
  | "blur"
  | "input"
  | "change"
  | "click"
  | "submit"
  | "scroll"
  | "consent_denied";

export interface SessionEvent {
  type: SessionEventType;
  timestamp: number;
  fieldId?: string;
  /** Masked / redacted value snapshot — never raw passwords. */
  valuePreview?: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface FormSessionRecording {
  id: string;
  formId: string;
  formType: string;
  startedAt: number;
  endedAt: number | null;
  events: SessionEvent[];
  consented: boolean;
  durationMs: number;
}

export interface SessionRecordingConfig {
  enabled: boolean;
  /** Require explicit opt-in before any recording. */
  requireConsent: boolean;
  /** Max events per session. */
  maxEvents: number;
  /** Max stored sessions in localStorage. */
  maxStoredSessions: number;
  /** Field name patterns that are always masked. */
  sensitiveFieldPatterns: string[];
  /** Persist recordings locally for playback. */
  persistLocally: boolean;
}

export interface PlaybackFrame {
  index: number;
  event: SessionEvent;
  elapsedMs: number;
  progress: number; // 0–1
}
