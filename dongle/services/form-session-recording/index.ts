/**
 * Form User Session Recording Service
 */

export {
  DEFAULT_CONFIG,
  STORAGE_KEY,
  CONSENT_KEY,
  createConfig,
} from "./config";

export {
  isSensitiveField,
  isPasswordInput,
  maskValue,
  getConsent,
  setConsent,
  clearConsent,
} from "./privacy";

export {
  SessionRecorder,
  buildPlayback,
  getStoredRecordings,
  getRecordingById,
  deleteRecording,
  clearAllRecordings,
  playRecording,
} from "./recorder";

export type {
  SessionEventType,
  SessionEvent,
  FormSessionRecording,
  SessionRecordingConfig,
  PlaybackFrame,
} from "./types";
