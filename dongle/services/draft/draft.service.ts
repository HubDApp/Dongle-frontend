/**
 * Draft Service
 * Manages draft project submissions in localStorage
 */

export interface ProjectDraft {
  id: string;
  data: {
    name: string;
    primaryCategory: string;
    tags: string[];
    description: string;
    websiteUrl: string;
    githubUrl: string;
    logoUrl: string;
    docsUrl: string;
  };
  lastSaved: string; // ISO timestamp
  mode: "create" | "edit";
  projectId?: string; // Only for edit mode
}

const DRAFT_STORAGE_KEY = "dongle_project_drafts";
const AUTO_SAVE_DEBOUNCE_MS = 1000;

class DraftService {
  private autoSaveTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Get all drafts from localStorage
   */
  getAllDrafts(): ProjectDraft[] {
    if (typeof window === "undefined") return [];
    
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored) as ProjectDraft[];
    } catch (error) {
      console.error("Failed to load drafts:", error);
      return [];
    }
  }

  /**
   * Get a specific draft by ID
   */
  getDraft(draftId: string): ProjectDraft | null {
    const drafts = this.getAllDrafts();
    return drafts.find((d) => d.id === draftId) || null;
  }

  /**
   * Get draft for a specific project (create or edit mode)
   */
  getDraftForProject(mode: "create" | "edit", projectId?: string): ProjectDraft | null {
    const drafts = this.getAllDrafts();
    
    if (mode === "create") {
      return drafts.find((d) => d.mode === "create") || null;
    }
    
    if (mode === "edit" && projectId) {
      return drafts.find((d) => d.mode === "edit" && d.projectId === projectId) || null;
    }
    
    return null;
  }

  /**
   * Save a draft immediately
   */
  saveDraft(draft: Omit<ProjectDraft, "lastSaved">): void {
    if (typeof window === "undefined") return;

    try {
      const drafts = this.getAllDrafts();
      const existingIndex = drafts.findIndex((d) => d.id === draft.id);
      
      const updatedDraft: ProjectDraft = {
        ...draft,
        lastSaved: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        drafts[existingIndex] = updatedDraft;
      } else {
        drafts.push(updatedDraft);
      }

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  }

  /**
   * Auto-save a draft with debouncing
   */
  autoSaveDraft(draft: Omit<ProjectDraft, "lastSaved">, debounceMs = AUTO_SAVE_DEBOUNCE_MS): void {
    const timerId = this.autoSaveTimers.get(draft.id);
    
    if (timerId) {
      clearTimeout(timerId);
    }

    const newTimerId = setTimeout(() => {
      this.saveDraft(draft);
      this.autoSaveTimers.delete(draft.id);
    }, debounceMs);

    this.autoSaveTimers.set(draft.id, newTimerId);
  }

  /**
   * Delete a specific draft
   */
  deleteDraft(draftId: string): void {
    if (typeof window === "undefined") return;

    try {
      const drafts = this.getAllDrafts();
      const filtered = drafts.filter((d) => d.id !== draftId);
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(filtered));
      
      // Clear any pending auto-save
      const timerId = this.autoSaveTimers.get(draftId);
      if (timerId) {
        clearTimeout(timerId);
        this.autoSaveTimers.delete(draftId);
      }
    } catch (error) {
      console.error("Failed to delete draft:", error);
    }
  }

  /**
   * Delete all drafts
   */
  clearAllDrafts(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      
      // Clear all pending auto-saves
      this.autoSaveTimers.forEach((timerId) => clearTimeout(timerId));
      this.autoSaveTimers.clear();
    } catch (error) {
      console.error("Failed to clear drafts:", error);
    }
  }

  /**
   * Check if form data has meaningful content (not just empty fields)
   */
  hasContent(data: ProjectDraft["data"]): boolean {
    return Boolean(
      data.name.trim() ||
      data.description.trim() ||
      data.websiteUrl.trim() ||
      data.githubUrl.trim() ||
      data.logoUrl.trim() ||
      data.docsUrl.trim() ||
      data.tags.length > 0
    );
  }
}

export const draftService = new DraftService();
