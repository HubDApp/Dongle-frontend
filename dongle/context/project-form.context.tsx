"use client";

import React, { createContext, useContext } from "react";
import type { ProjectFormValues } from "@/components/projects/ProjectForm";

/**
 * Shared form context for ProjectForm's nested components.
 *
 * Eliminates prop drilling by letting child components (DraftIndicator,
 * SubmissionChecklist, etc.) access form state directly via context.
 */
export interface ProjectFormContextValue {
  mode: "create" | "edit";
  projectId?: string;
  isSubmitting: boolean;
  /** Watch a single form field's value. */
  watchField: (name: keyof ProjectFormValues) => any;
  /** Get all form errors keyed by field name. */
  formErrors: Record<string, any>;
}

const ProjectFormContext = createContext<ProjectFormContextValue | null>(null);

export function useProjectFormContext(): ProjectFormContextValue {
  const ctx = useContext(ProjectFormContext);
  if (!ctx) {
    throw new Error("useProjectFormContext must be used within <ProjectFormContext.Provider>");
  }
  return ctx;
}

export { ProjectFormContext };
