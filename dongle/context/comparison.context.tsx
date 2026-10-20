"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Project } from "@/types/project";
import { useWallet } from "@/context/wallet.context";
import { saveComparisonSnapshot, type ComparisonHistoryEntry } from "@/utils/comparison-history.util";

interface ComparisonContextType {
  selectedProjects: Project[];
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  clearComparison: () => void;
  restoreProjects: (projects: Project[]) => void;
  saveCurrentComparison: (userAddress?: string | null) => ComparisonHistoryEntry | null;
  isSelected: (projectId: string) => boolean;
  canAddMore: boolean;
  maxSelections: number;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const MAX_SELECTIONS = 4;

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const { publicKey } = useWallet();

  const restoreProjects = useCallback((projects: Project[]) => {
    const unique = projects.filter((project, index, list) => list.findIndex((item) => item.id === project.id) === index);
    setSelectedProjects(unique.slice(0, MAX_SELECTIONS));
  }, []);

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

  const saveCurrentComparison = useCallback((userAddress?: string | null) => {
    return saveComparisonSnapshot(selectedProjects, userAddress ?? publicKey ?? null); 
  }, [selectedProjects, publicKey]);

  useEffect(() => {
    if (selectedProjects.length >= 2) {
      saveComparisonSnapshot(selectedProjects, publicKey ?? null);
    }
  }, [selectedProjects, publicKey]);

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
      restoreProjects,
      saveCurrentComparison,
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
