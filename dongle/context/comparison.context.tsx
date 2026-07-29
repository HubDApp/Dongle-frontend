"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Project } from "@/types/project";

interface ComparisonContextType {
  selectedProjects: Project[];
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  clearComparison: () => void;
  isSelected: (projectId: string) => boolean;
  canAddMore: boolean;
  maxSelections: number;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const MAX_SELECTIONS = 4;

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);

  const addProject = useCallback((project: Project) => {
    setSelectedProjects((prev) => {
      if (prev.length >= MAX_SELECTIONS) return prev;
      if (prev.some(p => p.id === project.id)) return prev;
      return [...prev, project];
    });
  }, []);

  const removeProject = useCallback((projectId: string) => {
    setSelectedProjects((prev) => prev.filter(p => p.id !== projectId));
  }, []);

  const clearComparison = useCallback(() => {
    setSelectedProjects([]);
  }, []);

  const isSelected = useCallback((projectId: string) => {
    return selectedProjects.some(p => p.id === projectId);
  }, [selectedProjects]);

  const canAddMore = selectedProjects.length < MAX_SELECTIONS;

  return (
    <ComparisonContext.Provider value={{
      selectedProjects,
      addProject,
      removeProject,
      clearComparison,
      isSelected,
      canAddMore,
      maxSelections: MAX_SELECTIONS,
    }}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error("useComparison must be used within ComparisonProvider");
  }
  return context;
}
