import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  __resetFormAuditIpCacheForTests,
  useFormAuditLog,
} from "@/hooks/useFormAuditLog";
import { formAuditLogService } from "@/services/audit/form-audit-log.service";
import { setIdGenerator, resetIdGenerator } from "@/lib/id-generator";

const IP_PAYLOAD = { ipAddress: "203.0.113.7", ipHash: "ip_deadbeef", ipSource: "server" };

let idCounter = 0;
function nextId() {
  return `hook-audit-${++idCounter}`;
}

function stubFetchSuccess() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => IP_PAYLOAD });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Let the cached IP promise settle before assertions. */
async function flushIpResolution() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("useFormAuditLog", () => {
  beforeEach(() => {
    localStorage.clear();
    idCounter = 0;
    setIdGenerator(nextId);
    __resetFormAuditIpCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetIdGenerator();
    localStorage.clear();
  });

  it("records a field change with identity, timestamp and server-stamped IP", async () => {
    stubFetchSuccess();
    const { result } = renderHook(() =>
      useFormAuditLog({ formId: "project-form", formType: "project-create", actor: "GACTOR" }),
    );
    await flushIpResolution();

    act(() => {
      result.current.logFieldChange("name", "Dongle", "");
    });

    const entries = formAuditLogService.list({ formId: "project-form" });
    expect(entries).toHaveLength(1);
    expect(entries[0].actor).toBe("GACTOR");
    expect(entries[0].action).toBe("field_change");
    expect(entries[0].field).toBe("name");
    expect(entries[0].value).toBe("Dongle");
    expect(entries[0].previousValue).toBe("");
    expect(entries[0].ipAddress).toBe("203.0.113.7");
    expect(entries[0].ipHash).toBe("ip_deadbeef");
    expect(entries[0].ipSource).toBe("server");
    expect(new Date(entries[0].timestamp).getTime()).not.toBeNaN();
  });

  it("logs only changes observed after the baseline snapshot", async () => {
    stubFetchSuccess();
    const { result } = renderHook(() =>
      useFormAuditLog({ formId: "project-form", formType: "project-create", actor: "GACTOR" }),
    );
    await flushIpResolution();

    act(() => {
      result.current.trackValues({ name: "Alpha", description: "unchanged" });
    });
    expect(formAuditLogService.list({ formId: "project-form" })).toHaveLength(0);

    act(() => {
      result.current.trackValues({ name: "Beta", description: "unchanged" });
    });

    const entries = formAuditLogService.list({ formId: "project-form" });
    expect(entries).toHaveLength(1);
    expect(entries[0].field).toBe("name");
    expect(entries[0].previousValue).toBe("Alpha");
    expect(entries[0].value).toBe("Beta");
  });

  it("logs form-level actions with metadata", async () => {
    stubFetchSuccess();
    const { result } = renderHook(() =>
      useFormAuditLog({ formId: "review-form", formType: "review-create", actor: "GBOB" }),
    );
    await flushIpResolution();

    act(() => {
      result.current.logAction("form_submit", { metadata: { mode: "create" } });
    });

    const [entry] = formAuditLogService.list();
    expect(entry.action).toBe("form_submit");
    expect(entry.actor).toBe("GBOB");
    expect(entry.metadata).toEqual({ mode: "create" });
  });

  it("falls back to anonymous when no actor is supplied", () => {
    stubFetchSuccess();
    const { result } = renderHook(() =>
      useFormAuditLog({ formId: "project-form", formType: "project-create" }),
    );

    act(() => {
      result.current.logFieldChange("name", "Dongle");
    });

    expect(formAuditLogService.list()[0].actor).toBe("anonymous");
  });

  it("marks the IP unavailable when the endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() =>
      useFormAuditLog({ formId: "project-form", formType: "project-create", actor: "GACTOR" }),
    );
    await flushIpResolution();

    act(() => {
      result.current.logFieldChange("name", "Dongle");
    });

    const [entry] = formAuditLogService.list();
    expect(entry.ipAddress).toBeNull();
    expect(entry.ipHash).toBeNull();
    expect(entry.ipSource).toBe("unavailable");
  });

  it("records nothing when disabled", () => {
    const fetchMock = stubFetchSuccess();
    const { result } = renderHook(() =>
      useFormAuditLog({
        formId: "project-form",
        formType: "project-create",
        actor: "GACTOR",
        enabled: false,
      }),
    );

    act(() => {
      expect(result.current.logFieldChange("name", "Dongle")).toBeNull();
      expect(result.current.logAction("form_submit")).toBeNull();
      result.current.trackValues({ name: "Dongle" });
    });

    expect(formAuditLogService.count()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serialises non-string values so arrays are auditable", async () => {
    stubFetchSuccess();
    const { result } = renderHook(() =>
      useFormAuditLog({ formId: "project-form", formType: "project-create", actor: "GACTOR" }),
    );
    await flushIpResolution();

    act(() => {
      result.current.logFieldChange("tags", ["defi", "dex"]);
    });

    expect(formAuditLogService.list()[0].value).toBe('["defi","dex"]');
  });
});
