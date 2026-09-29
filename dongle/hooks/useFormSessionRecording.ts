/**
 * Hook: optional, privacy-respecting form session recording + playback.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SessionRecorder,
  buildPlayback,
  getConsent,
  getStoredRecordings,
  playRecording,
  setConsent,
  type FormSessionRecording,
  type PlaybackFrame,
  type SessionRecordingConfig,
} from "@/services/form-session-recording";

export interface UseFormSessionRecordingOptions {
  formId: string;
  formType: string;
  enabled?: boolean;
  config?: Partial<SessionRecordingConfig>;
  /** Auto-attach when consent already granted. */
  autoStart?: boolean;
}

export function useFormSessionRecording(options: UseFormSessionRecordingOptions) {
  const { formId, formType, enabled = true, config, autoStart = true } = options;
  const recorderRef = useRef<SessionRecorder | null>(null);
  const formElRef = useRef<HTMLElement | null>(null);
  const cancelPlaybackRef = useRef<(() => void) | null>(null);

  const [consented, setConsented] = useState<boolean | null>(null);
  const [recording, setRecording] = useState<FormSessionRecording | null>(null);
  const [recordings, setRecordings] = useState<FormSessionRecording[]>([]);
  const [playbackFrame, setPlaybackFrame] = useState<PlaybackFrame | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setConsented(getConsent());
    setRecordings(getStoredRecordings(formId));
  }, [formId]);

  useEffect(() => {
    recorderRef.current = new SessionRecorder(formId, formType, {
      ...config,
      enabled,
    });
  }, [formId, formType, enabled, config]);

  const attachRef = useCallback(
    (node: HTMLElement | null) => {
      if (formElRef.current && recorderRef.current) {
        recorderRef.current.detach();
      }
      formElRef.current = node;
      if (!node || !enabled || !autoStart) return;
      if (getConsent() !== true) return;
      recorderRef.current?.attach(node);
      setRecording(recorderRef.current?.getCurrent() ?? null);
    },
    [enabled, autoStart],
  );

  const enableRecording = useCallback(() => {
    setConsent(true);
    setConsented(true);
    recorderRef.current?.setUserConsent(true);
    if (formElRef.current) {
      recorderRef.current?.attach(formElRef.current);
      setRecording(recorderRef.current?.getCurrent() ?? null);
    }
  }, []);

  const disableRecording = useCallback(() => {
    setConsent(false);
    setConsented(false);
    recorderRef.current?.setUserConsent(false);
    setRecording(null);
    setRecordings([]);
  }, []);

  const stop = useCallback(() => {
    const done = recorderRef.current?.stop() ?? null;
    setRecording(null);
    setRecordings(getStoredRecordings(formId));
    return done;
  }, [formId]);

  const startPlayback = useCallback(
    (session: FormSessionRecording, speed = 1) => {
      cancelPlaybackRef.current?.();
      setPlaying(true);
      cancelPlaybackRef.current = playRecording(
        session,
        (frame) => {
          setPlaybackFrame(frame);
          if (frame.index === session.events.length - 1) {
            setPlaying(false);
          }
        },
        { speed },
      );
    },
    [],
  );

  const stopPlayback = useCallback(() => {
    cancelPlaybackRef.current?.();
    cancelPlaybackRef.current = null;
    setPlaying(false);
  }, []);

  const getFrames = useCallback(
    (session: FormSessionRecording) => buildPlayback(session),
    [],
  );

  useEffect(() => {
    return () => {
      recorderRef.current?.detach();
      cancelPlaybackRef.current?.();
    };
  }, []);

  return {
    formRef: attachRef,
    consented,
    recording,
    recordings,
    playbackFrame,
    playing,
    enableRecording,
    disableRecording,
    stop,
    startPlayback,
    stopPlayback,
    getFrames,
  };
}
