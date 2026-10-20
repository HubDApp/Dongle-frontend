"use client";

import React from "react";
import type { FormSessionRecording, PlaybackFrame } from "@/services/form-session-recording";

export interface FormSessionRecordingControlsProps {
  consented: boolean | null;
  onEnable: () => void;
  onDisable: () => void;
  recordings: FormSessionRecording[];
  playing: boolean;
  playbackFrame: PlaybackFrame | null;
  onPlay: (recording: FormSessionRecording) => void;
  onStopPlayback: () => void;
  className?: string;
}

/**
 * Opt-in UI for session recording and simple playback list.
 */
export function FormSessionRecordingControls({
  consented,
  onEnable,
  onDisable,
  recordings,
  playing,
  playbackFrame,
  onPlay,
  onStopPlayback,
  className = "",
}: FormSessionRecordingControlsProps) {
  return (
    <div
      className={`rounded-md border border-neutral-200 p-3 text-sm ${className}`}
      role="region"
      aria-label="Form session recording"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-neutral-700">
          Session recording is{" "}
          <strong>{consented === true ? "on" : "off"}</strong>. Passwords are
          always masked. You can disable anytime.
        </p>
        <div className="flex gap-2">
          {consented !== true ? (
            <button
              type="button"
              onClick={onEnable}
              className="rounded bg-neutral-900 px-3 py-1.5 text-xs text-white"
            >
              Enable recording
            </button>
          ) : (
            <button
              type="button"
              onClick={onDisable}
              className="rounded border border-neutral-300 px-3 py-1.5 text-xs"
            >
              Disable & erase
            </button>
          )}
        </div>
      </div>

      {recordings.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-neutral-600">Playback</p>
          <ul className="space-y-1">
            {recordings.map((rec) => (
              <li
                key={rec.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span>
                  {rec.id} · {rec.events.length} events ·{" "}
                  {Math.round(rec.durationMs / 1000)}s
                </span>
                <button
                  type="button"
                  className="underline"
                  onClick={() => onPlay(rec)}
                >
                  Play
                </button>
              </li>
            ))}
          </ul>
          {playing && (
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <span>
                Playing: {playbackFrame?.event.type ?? "…"} (
                {Math.round((playbackFrame?.progress ?? 0) * 100)}%)
              </span>
              <button type="button" className="underline" onClick={onStopPlayback}>
                Stop
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
