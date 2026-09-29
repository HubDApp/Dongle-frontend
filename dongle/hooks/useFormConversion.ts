/**
 * Hook: form conversion tracking (UTM, referrer, device, funnel events).
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  analyzeConversionFunnel,
  captureAttribution,
  trackConversion,
  type AttributionContext,
  type ConversionEventName,
  type ConversionFunnel,
} from "@/services/form-conversion";

export interface UseFormConversionOptions {
  formId: string;
  formType: string;
  enabled?: boolean;
  /** Auto-track form_view on mount. */
  trackViewOnMount?: boolean;
}

export function useFormConversion(options: UseFormConversionOptions) {
  const { formId, formType, enabled = true, trackViewOnMount = true } = options;
  const startedRef = useRef(false);
  const attributionRef = useRef<AttributionContext | null>(null);

  useEffect(() => {
    if (!enabled) return;
    attributionRef.current = captureAttribution();
    if (trackViewOnMount) {
      trackConversion("form_view", formId, formType);
    }
  }, [enabled, formId, formType, trackViewOnMount]);

  const track = useCallback(
    (
      name: ConversionEventName,
      properties?: Record<string, string | number | boolean | null>,
    ) => {
      if (!enabled) return null;
      if (name === "form_start") startedRef.current = true;
      return trackConversion(name, formId, formType, properties);
    },
    [enabled, formId, formType],
  );

  const trackStart = useCallback(() => {
    if (startedRef.current) return null;
    return track("form_start");
  }, [track]);

  const trackFieldComplete = useCallback(
    (fieldId: string) => track("form_field_complete", { field_id: fieldId }),
    [track],
  );

  const trackSubmitAttempt = useCallback(
    () => track("form_submit_attempt"),
    [track],
  );

  const trackSuccess = useCallback(
    (properties?: Record<string, string | number | boolean | null>) =>
      track("form_submit_success", properties),
    [track],
  );

  const trackFailure = useCallback(
    (errorCode?: string) =>
      track("form_submit_failure", { error_code: errorCode ?? "unknown" }),
    [track],
  );

  const trackAbandon = useCallback(() => track("form_abandon"), [track]);

  const getFunnel = useCallback(
    (): ConversionFunnel => analyzeConversionFunnel(formId, formType),
    [formId, formType],
  );

  return {
    track,
    trackStart,
    trackFieldComplete,
    trackSubmitAttempt,
    trackSuccess,
    trackFailure,
    trackAbandon,
    getFunnel,
    attribution: attributionRef,
  };
}
