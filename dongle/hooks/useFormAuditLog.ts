"use client";

/**
 * Form Audit Log Hook
 *
 * Records form interactions (field changes, submit attempts) through
 * `formAuditLogService` so every entry carries a timestamp, the acting user,
 * and the client IP stamped server-side.
 *
 * Usage:
 *   const { trackValues, logAction } = useFormAuditLog({
 *     formId: "project-form",
 *     formType: "project-create",
 *     actor: publicKey,
 *   });
 *
 *   useEffect(() => {
 *     trackValues(watchedValues);
 *   }, [trackValues, JSON.stringify(watchedValues)]);
 *
 *   <form id="project-form" onSubmit={handleSubmit(() => logAction("form_submit"))}>
 */

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth.context";
import { formAuditLogService } from "@/services/audit/form-audit-log.service";
import type {
  ClientIpContext,
  FormAuditAction,
  FormAuditLogEntry,
} from "@/types/form-audit-log";

/** Endpoint that extracts the client IP server-side (a browser cannot). */
export const CLIENT_IP_ENDPOINT = "/api/audit/client-ip";

const UNRESOLVED_IP: ClientIpContext = {
  ipAddress: null,
  ipHash: null,
  ipSource: "unavailable",
};

let clientIpPromise: Promise<ClientIpContext> | null = null;

/**
 * Fetch the server-stamped client IP once per page load and cache it.
 * Never throws: on any failure the context resolves to `unavailable`.
 */
export function fetchClientIpContext(): Promise<ClientIpContext> {
  if (clientIpPromise) return clientIpPromise;

  if (typeof fetch !== "function") {
    clientIpPromise = Promise.resolve(UNRESOLVED_IP);
    return clientIpPromise;
  }

  try {
    clientIpPromise = Promise.resolve(
      fetch(CLIENT_IP_ENDPOINT, { headers: { Accept: "application/json" } }),
    )
      .then((res) => (res.ok ? res.json() : UNRESOLVED_IP))
      .then((data: Partial<ClientIpContext> | null) => ({
        ipAddress: typeof data?.ipAddress === "string" ? data.ipAddress : null,
        ipHash: typeof data?.ipHash === "string" ? data.ipHash : null,
        ipSource: data?.ipSource === "server" ? ("server" as const) : ("unavailable" as const),
      }))
      .catch(() => UNRESOLVED_IP);
  } catch {
    clientIpPromise = Promise.resolve(UNRESOLVED_IP);
  }

  return clientIpPromise;
}

/** Test-only: clear the module-level IP cache. */
export function __resetFormAuditIpCacheForTests(): void {
  clientIpPromise = null;
}

export interface UseFormAuditLogOptions {
  /** Stable id matching the `<form id>` attribute. */
  formId: string;
  /** Logical form name, e.g. "project-create". */
  formType: string;
  /** Acting user; falls back to the OAuth session subject, then "anonymous". */
  actor?: string | null;
  /** Disable recording (e.g. a read-only preview). Defaults to true. */
  enabled?: boolean;
}

export interface LogActionExtras {
  field?: string;
  value?: unknown;
  metadata?: Record<string, string | number | boolean>;
}

export interface FormAuditLogHandle {
  /** Record a single field change with its previous value. */
  logFieldChange: (
    field: string,
    value: unknown,
    previousValue?: unknown,
  ) => FormAuditLogEntry | null;
  /** Record a form-level action (submit, failure, reset). */
  logAction: (action: FormAuditAction, extra?: LogActionExtras) => FormAuditLogEntry | null;
  /** Diff a values object against the previous snapshot and log each change. */
  trackValues: (values: object) => void;
}

function stringifyFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

function normalizeValues(values: object): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    out[key] = stringifyFieldValue(value);
  }
  return out;
}

export function useFormAuditLog(options: UseFormAuditLogOptions): FormAuditLogHandle {
  const { formId, formType, actor, enabled = true } = options;
  const { user } = useAuth();
  const resolvedActor = actor ?? user?.id ?? "anonymous";

  const ipRef = useRef<ClientIpContext>(UNRESOLVED_IP);
  const snapshotRef = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void fetchClientIpContext().then((ctx) => {
      if (active) ipRef.current = ctx;
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  const logFieldChange = useCallback(
    (field: string, value: unknown, previousValue?: unknown) => {
      if (!enabled || !field) return null;
      const ip = ipRef.current;
      return formAuditLogService.record({
        formId,
        formType,
        actor: resolvedActor,
        action: "field_change",
        field,
        value: stringifyFieldValue(value),
        previousValue:
          previousValue === undefined ? undefined : stringifyFieldValue(previousValue),
        ipAddress: ip.ipAddress,
        ipHash: ip.ipHash,
        ipSource: ip.ipSource,
      });
    },
    [enabled, formId, formType, resolvedActor],
  );

  const logAction = useCallback(
    (action: FormAuditAction, extra: LogActionExtras = {}) => {
      if (!enabled) return null;
      const ip = ipRef.current;
      return formAuditLogService.record({
        formId,
        formType,
        actor: resolvedActor,
        action,
        field: extra.field,
        value: extra.value === undefined ? undefined : stringifyFieldValue(extra.value),
        metadata: extra.metadata,
        ipAddress: ip.ipAddress,
        ipHash: ip.ipHash,
        ipSource: ip.ipSource,
      });
    },
    [enabled, formId, formType, resolvedActor],
  );

  const trackValues = useCallback(
    (values: object) => {
      if (!enabled) return;
      const current = normalizeValues(values);
      const previous = snapshotRef.current;
      snapshotRef.current = current;
      // The first snapshot establishes the baseline; only later changes are logged.
      if (!previous) return;
      for (const key of Object.keys(current)) {
        const before = previous[key];
        const after = current[key];
        if (before !== after) {
          logFieldChange(key, after, before);
        }
      }
    },
    [enabled, logFieldChange],
  );

  return { logFieldChange, logAction, trackValues };
}
