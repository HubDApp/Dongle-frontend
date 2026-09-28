"use client";

import React, { useMemo } from "react";
import {
  evaluateVisibility,
  ConditionBuilder,
  type VisibilityConditionDef,
  type ConditionInput,
} from "@/lib/form-visibility";

export interface ConditionalFieldProps {
  /** The visibility condition, builder instance, or builder callback. */
  condition: ConditionInput;
  /** Current form values. */
  values: Record<string, any>;
  /** Optional element to render when the condition evaluates to false. */
  fallback?: React.ReactNode;
  /** When true, completely unmounts children when hidden. Default: true. */
  unmountOnHide?: boolean;
  /** Optional wrapper className when unmountOnHide is false. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Hook to evaluate whether a condition is met given form values.
 */
export function useFieldVisibility(
  condition: ConditionInput,
  values: Record<string, any>
): boolean {
  return useMemo(() => {
    if (!condition) return true;
    if (condition instanceof ConditionBuilder) {
      return condition.evaluate(values || {});
    }
    if (typeof condition === "function") {
      const builder = new ConditionBuilder();
      return condition(builder).evaluate(values || {});
    }
    return evaluateVisibility(condition, values || {});
  }, [condition, values]);
}

/**
 * Reusable component for conditionally displaying form fields based on
 * values of other fields (Issue #507).
 */
export const ConditionalField: React.FC<ConditionalFieldProps> = ({
  condition,
  values,
  fallback = null,
  unmountOnHide = true,
  className = "",
  children,
}) => {
  const isVisible = useFieldVisibility(condition, values);

  if (isVisible) {
    return <>{children}</>;
  }

  if (unmountOnHide) {
    return <>{fallback}</>;
  }

  return (
    <div
      style={{ display: "none" }}
      aria-hidden="true"
      className={className}
    >
      {children}
    </div>
  );
};
