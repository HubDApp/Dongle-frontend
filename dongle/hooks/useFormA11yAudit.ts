"use client";

/**
 * useFormA11yAudit — React hook for Issue #526
 *
 * Attaches to a form container ref and runs the accessibility audit on demand
 * or automatically whenever the form content changes.
 *
 * Usage:
 * ```tsx
 * const formRef = useRef<HTMLFormElement>(null);
 * const { result, run, clear } = useFormA11yAudit(formRef);
 * ```
 */

import { useCallback, useRef, useState } from "react";
import { auditFormNode, type A11yAuditResult } from "@/lib/form-a11y-audit";

export interface UseFormA11yAuditReturn {
  /** Latest audit result, or null if the audit has not been run yet. */
  result: A11yAuditResult | null;
  /** Whether the audit is currently running. */
  running: boolean;
  /** Manually trigger the audit. */
  run: () => void;
  /** Clear the current result. */
  clear: () => void;
}

export function useFormA11yAudit(
  containerRef: React.RefObject<Element | null>,
): UseFormA11yAuditReturn {
  const [result, setResult] = useState<A11yAuditResult | null>(null);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const run = useCallback(() => {
    if (runningRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    runningRef.current = true;
    setRunning(true);

    // Defer to next frame so any pending DOM updates are flushed first
    requestAnimationFrame(() => {
      try {
        const auditResult = auditFormNode(container);
        setResult(auditResult);
      } finally {
        runningRef.current = false;
        setRunning(false);
      }
    });
  }, [containerRef]);

  const clear = useCallback(() => {
    setResult(null);
  }, []);

  return { result, running, run, clear };
}
