import { useState, useEffect } from "react";
import { Project } from "@/types/project";
import { recentViewsService } from "@/services/recent-views/recent-views.service";

/**
 * Hook for accessing and managing recently viewed projects
 */
export function useRecentViews(walletAddress?: string) {
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load recent projects
  useEffect(() => {
    setIsLoading(true);
    const projects = recentViewsService.getRecentProjects(walletAddress);
    setRecentProjects(projects);
    setIsLoading(false);
  }, [walletAddress]);

  // Track a new project view
  const trackView = (projectId: string) => {
    recentViewsService.addView(projectId, walletAddress);
    // Refresh the list
    const projects = recentViewsService.getRecentProjects(walletAddress);
    setRecentProjects(projects);
  };

  // Clear all recent views
  const clearHistory = () => {
    recentViewsService.clearViews(walletAddress);
    setRecentProjects([]);
  };

  return {
    recentProjects,
    isLoading,
    trackView,
    clearHistory,
    hasHistory: recentProjects.length > 0,
  };
}
