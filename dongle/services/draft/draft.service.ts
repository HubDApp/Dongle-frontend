/**
 * Draft Service
 *
 * Hybrid persistence strategy:
 *   • Wallet connected  → save/load/delete via the server API
 *                         (keyed by wallet address, 30-day TTL)
 *   • No wallet         → fall back to localStorage
 *
 * The service itself is stateless with respect to the wallet address.
 * Callers (the useDraft hook) pass the wallet address when one is available.
 */

import { draftApiService } from "@/services/draft/draft-api.service";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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
    /** optional fields added by ProjectForm */
    auditReportUrl?: string;
    bugBountyUrl?: string;
  };
  lastSaved: string; // ISO timestamp
  mode: "create" | "edit";
  projectId?: string; // Only for edit mode
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRAFT_STORAGE_KEY = "dongle_project_drafts";
/** Default debounce kept for the auto-save timer in the hook. */
export const AUTO_SAVE_DEBOUNCE_MS = 2000;

// ---------------------------------------------------------------------------
// DraftService
// ---------------------------------------------------------------------------

class DraftService {
  // ── localStorage helpers ──────────────────────────────────────────────────

  /**
   * Return all drafts stored in localStorage.
   * Safe to call during SSR (returns empty array).
   */
  getAllDrafts(): ProjectDraft[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored) as ProjectDraft[];
    } catch {
      return [];
    }
  }

  /** Get a specific draft from localStorage by ID. */
  getDraft(draftId: string): ProjectDraft | null {
    return this.getAllDrafts().find((d) => d.id === draftId) ?? null;
  }

  /**
   * Get the localStorage draft matching a mode/projectId combo.
   * Used by the hook when no wallet is available.
   */
  getDraftForProject(
    mode: "create" | "edit",
    projectId?: string
  ): ProjectDraft | null {
    const drafts = this.getAllDrafts();
    if (mode === "create") {
      return drafts.find((d) => d.mode === "create") ?? null;
    }
    if (mode === "edit" && projectId) {
      return (
        drafts.find((d) => d.mode === "edit" && d.projectId === projectId) ??
        null
      );
    }
    return null;
  }

  // ── Synchronous localStorage write ───────────────────────────────────────

  /** Persist a draft to localStorage immediately. */
  saveDraft(draft: Omit<ProjectDraft, "lastSaved">): void {
    if (typeof window === "undefined") return;
    try {
      const drafts = this.getAllDrafts();
      const idx = drafts.findIndex((d) => d.id === draft.id);
      const updated: ProjectDraft = {
        ...draft,
        lastSaved: new Date().toISOString(),
      };
      if (idx >= 0) {
        drafts[idx] = updated;
      } else {
        drafts.push(updated);
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch (err) {
      console.error("Failed to save draft to localStorage:", err);
    }
  }

  // ── Async API write ───────────────────────────────────────────────────────

  /**
   * Persist a draft via the server API.
   * Returns the persisted draft (with server timestamp) on success, or null.
   */
  async saveDraftRemote(
    walletAddress: string,
    draft: Omit<ProjectDraft, "lastSaved">
  ): Promise<ProjectDraft | null> {
    const result = await draftApiService.saveDraft(walletAddress, draft);
    if (result.ok) return result.data;
    console.error("Remote draft save failed:", result.error);
    return null;
  }

  /**
   * Load a draft from the server API.
   * Returns null on 404 or any network error.
   */
  async getDraftRemote(
    walletAddress: string,
    draftId: string
  ): Promise<ProjectDraft | null> {
    const result = await draftApiService.getDraft(walletAddress, draftId);
    if (result.ok) return result.data;
    if (result.status !== 404) {
      console.error("Remote draft fetch failed:", result.error);
    }
    return null;
  }

  /**
   * Delete a draft from the server API.
   */
  async deleteDraftRemote(
    walletAddress: string,
    draftId: string
  ): Promise<void> {
    const result = await draftApiService.deleteDraft(walletAddress, draftId);
    if (!result.ok && result.status !== 404) {
      console.error("Remote draft delete failed:", result.error);
    }
  }

  // ── localStorage delete ───────────────────────────────────────────────────

  deleteDraft(draftId: string): void {
    if (typeof window === "undefined") return;
    try {
      const drafts = this.getAllDrafts().filter((d) => d.id !== draftId);
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch (err) {
      console.error("Failed to delete draft:", err);
    }
  }

  clearAllDrafts(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear drafts:", err);
    }
  }

  // ── Content guard ─────────────────────────────────────────────────────────

  /**
   * Returns true if the draft data has at least one non-empty field.
   * Prevents saving skeleton/empty drafts.
   */
  hasContent(data: ProjectDraft["data"]): boolean {
    return Boolean(
      data.name.trim() ||
        data.description.trim() ||
        data.websiteUrl.trim() ||
        data.githubUrl.trim() ||
        data.logoUrl.trim() ||
        data.docsUrl.trim() ||
        (data.auditReportUrl ?? "").trim() ||
        (data.bugBountyUrl ?? "").trim() ||
        data.tags.length > 0
    );
  }
}

export const draftService = new DraftService();
