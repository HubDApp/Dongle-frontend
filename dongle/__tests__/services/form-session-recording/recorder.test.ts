import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SessionRecorder,
  buildPlayback,
  clearAllRecordings,
  getConsent,
  getStoredRecordings,
  maskValue,
  playRecording,
  setConsent,
} from "@/services/form-session-recording";

beforeEach(() => {
  window.localStorage.clear();
  clearAllRecordings();
});

describe("privacy masking", () => {
  it("masks password fields", () => {
    const input = document.createElement("input");
    input.type = "password";
    expect(maskValue("hunter2", "password", input)).toBe("••••••••");
  });

  it("masks sensitive field names", () => {
    expect(maskValue("abc", "api_token")).toBe("••••••••");
  });

  it("redacts emails and wallets in previews", () => {
    expect(maskValue("a@b.com", "contact")).toBe("[email]");
    const wallet = `G${"A".repeat(55)}`;
    expect(maskValue(wallet, "addr")).toBe("[wallet]");
  });
});

describe("consent + recording", () => {
  it("does not record without consent", () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    const recorder = new SessionRecorder("f1", "project-submission");
    recorder.attach(form);
    expect(recorder.getCurrent()).toBeNull();
    form.remove();
  });

  it("records interactions when consented and masks passwords", () => {
    setConsent(true);
    expect(getConsent()).toBe(true);

    const form = document.createElement("form");
    const pw = document.createElement("input");
    pw.type = "password";
    pw.name = "password";
    form.appendChild(pw);
    document.body.appendChild(form);

    const recorder = new SessionRecorder("f1", "project-submission");
    recorder.attach(form);
    expect(recorder.getCurrent()).not.toBeNull();

    pw.value = "super-secret";
    pw.dispatchEvent(new Event("input", { bubbles: true }));

    const current = recorder.getCurrent()!;
    const inputEvent = current.events.find((e) => e.type === "input");
    expect(inputEvent?.valuePreview).toBe("••••••••");

    const done = recorder.stop();
    expect(done?.endedAt).not.toBeNull();
    expect(getStoredRecordings("f1").length).toBe(1);

    setConsent(false);
    expect(getStoredRecordings().length).toBe(0);
    form.remove();
  });

  it("supports playback frames and cancel", () => {
    setConsent(true);
    const form = document.createElement("form");
    document.body.appendChild(form);
    const recorder = new SessionRecorder("f2", "t");
    recorder.attach(form);
    form.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const recording = recorder.stop()!;

    const frames = buildPlayback(recording);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].progress).toBeGreaterThanOrEqual(0);

    vi.useFakeTimers();
    const seen: string[] = [];
    const cancel = playRecording(recording, (f) => seen.push(f.event.type), {
      speed: 1000,
    });
    vi.runAllTimers();
    expect(seen.length).toBe(frames.length);
    cancel();
    vi.useRealTimers();
    form.remove();
  });
});
