"use client";

import React from "react";
import { useFormExperiment } from "@/hooks/useFormExperiment";

interface FormExperimentVariantProps {
  experimentId: string;
  variantId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally render UI based on the active A/B experiment variant
 */
export function FormExperimentVariant({
  experimentId,
  variantId,
  children,
  fallback = null,
}: FormExperimentVariantProps) {
  const { variant } = useFormExperiment({ experimentId });

  if (variant.id === variantId) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
