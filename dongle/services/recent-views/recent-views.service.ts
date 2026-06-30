import { Project } from "@/types/project";
import { projectService } from "@/services/project/project.service";

const STORAGE_KEY = "dongle_recent_views";
const MAX_RECENT_ITEMS = 10;

export interface RecentView {
  projectId: string;
  viewedAt: string; // ISO date string
  walletAddress?: string; // Optional: scope to wallet
}

/**
 * Service for tracking recently viewed projects
 * Stores data in localStorage with optional wallet-scoped tracking
 */
export const recentViewsService = {
  /**
   * Get all recent views from storage
   */
  getAllViews(): RecentView[] {
    if (typeof window === "undefined") return [];
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading recent views:", error);
      return [];
    }
  },

  /**
   * Get recent views for a specific wallet (or all if no wallet specified)
   */
  getRecentViews(walletAddress?: string): RecentView[] {
    const allViews = this.getAllViews();
    
    if (!walletAddress) {
      return allViews;
    }
    
    return allViews.filter(view => view.walletAddress === walletAddress);
  },

  /**
   * Get recent project details with full project data
   */
  getRecentProjects(walletAddress?: string): Project[] {
    const views = this.getRecentViews(walletAddress);
    
    // Map to projects and filter out any that no longer exist
    const projects = views
      .map(view => projectService.getProjectById(view.projectId))
      .filter((project): project is Project => project !== null);
    
    return projects;
  },

  /**
   * Add a project view to recent history
   * Automatically deduplicates and maintains order
   */
  addView(projectId: string, walletAddress?: string): void {
    if (typeof window === "undefined") return;
    
    try {
      let views = this.getAllViews();
      
      // Remove any existing views of this project by this wallet (or globally if no wallet)
      views = views.filter(view => {
        if (walletAddress) {
          // If wallet is specified, only remove this project for this wallet
          return !(view.projectId === projectId && view.walletAddress === walletAddress);
        } else {
          // If no wallet, remove this project for any non-wallet views
          return !(view.projectId === projectId && !view.walletAddress);
        }
      });
      
      // Add the new view at the beginning
      const newView: RecentView = {
        projectId,
        viewedAt: new Date().toISOString(),
        ...(walletAddress && { walletAddress }),
      };
      
      views.unshift(newView);
      
      // Keep only the most recent MAX_RECENT_ITEMS
      views = views.slice(0, MAX_RECENT_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
    } catch (error) {
      console.error("Error saving recent view:", error);
    }
  },

  /**
   * Clear all recent views (optionally for a specific wallet)
   */
  clearViews(walletAddress?: string): void {
    if (typeof window === "undefined") return;
    
    try {
      if (!walletAddress) {
        // Clear all
        localStorage.removeItem(STORAGE_KEY);
      } else {
        // Clear only for specific wallet
        let views = this.getAllViews();
        views = views.filter(view => view.walletAddress !== walletAddress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
      }
    } catch (error) {
      console.error("Error clearing recent views:", error);
    }
  },

  /**
   * Check if a project has been viewed recently
   */
  hasViewed(projectId: string, walletAddress?: string): boolean {
    const views = this.getRecentViews(walletAddress);
    return views.some(view => view.projectId === projectId);
  },

  /**
   * Get the timestamp of when a project was last viewed
   */
  getLastViewedAt(projectId: string, walletAddress?: string): string | null {
    const views = this.getRecentViews(walletAddress);
    const view = views.find(view => view.projectId === projectId);
    return view?.viewedAt || null;
  },
};
