/**
 * Draft Service
 *
 * Hybrid persistence strategy:
 *   • Wallet connected  → save/load/delete via the server API
 *                         (keyed by wallet address, 30-day TTL)
 *   • No wallet         → fall back to localStorage (ENCRYPTED via crypto-storage)
 *
 * Encrypted LocalStorage Architecture:
 *   • Drafts stored locally are encrypted with AES-256 using crypto-js.
 *   • Encryption key is derived using the SHA-256 hash of the user's Stellar public key:
 *       `key = CryptoJS.SHA256(publicKey).toString()`
 *   • If no wallet/public key is provided, a fallback app key hash is used.
 *   • Legacy unencrypted drafts are automatically migrated to encrypted format on first read.
 *   • Warnings are logged and handled safely if decryption fails (e.g. wrong key or corrupted payload).
 */

import { draftApiService } from "@/services/draft/draft-api.service";
import {
  getItemAndDecrypt,
  setItemAndEncrypt,
  isEncrypted,
  type DecryptOptions,
} from "@/lib/crypto-storage";

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
  // ── Encrypted localStorage helpers ────────────────────────────────────────

  /**
   * Return all drafts stored in localStorage (encrypted).
   * Encrypted using user's Stellar public key hash (or fallback key if not connected).
   * Automatically migrates legacy unencrypted drafts on read.
   * Safe to call during SSR (returns empty array).
   *
   * @param publicKey - Optional Stellar public key
   * @param options - Decryption options (warnings, callbacks)
   */
  getAllDrafts(publicKey?: string | null, options?: DecryptOptions): ProjectDraft[] {
    if (typeof window === "undefined") return [];
    try {
      const drafts = getItemAndDecrypt<ProjectDraft[]>(DRAFT_STORAGE_KEY, publicKey, {
        showConsoleWarning: true,
        ...options,
      });
      return drafts ?? [];
    } catch (err) {
      console.warn("[DraftService Warning] Failed to read or decrypt drafts:", err);
      return [];
    }
  }

  /**
   * Get a specific draft from encrypted localStorage by ID.
   *
   * @param draftId - Unique ID of the draft
   * @param publicKey - Optional Stellar public key
   */
  getDraft(draftId: string, publicKey?: string | null): ProjectDraft | null {
    return this.getAllDrafts(publicKey).find((d) => d.id === draftId) ?? null;
  }

  /**
   * Get the localStorage draft matching a mode/projectId combo.
   * Used by the hook when no wallet is available or offline.
   *
   * @param mode - "create" | "edit"
   * @param projectId - Optional project ID for edit mode
   * @param publicKey - Optional Stellar public key
   */
  getDraftForProject(
    mode: "create" | "edit",
    projectId?: string,
    publicKey?: string | null
  ): ProjectDraft | null {
    const drafts = this.getAllDrafts(publicKey);
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

  /**
   * Migrate any existing unencrypted drafts in localStorage on first load.
   * Re-encrypts data using the user's Stellar public key hash (or default key).
   *
   * @param publicKey - Optional Stellar public key
   */
  migrateUnencryptedDrafts(publicKey?: string | null): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw && !isEncrypted(raw)) {
        const unencryptedDrafts = JSON.parse(raw) as ProjectDraft[];
        setItemAndEncrypt(DRAFT_STORAGE_KEY, unencryptedDrafts, publicKey);
        console.info("[DraftService] Successfully migrated legacy unencrypted drafts to encrypted storage.");
      }
    } catch (err) {
      console.warn("[DraftService Warning] Could not migrate legacy unencrypted drafts:", err);
    }
  }

  // ── Synchronous encrypted localStorage write ─────────────────────────────

  /**
   * Persist a draft to encrypted localStorage immediately.
   * Encrypts the payload with user's Stellar public key hash.
   *
   * @param draft - Draft object to save
   * @param publicKey - Optional Stellar public key
   */
  saveDraft(draft: Omit<ProjectDraft, "lastSaved">, publicKey?: string | null): void {
    if (typeof window === "undefined") return;
    try {
      const drafts = this.getAllDrafts(publicKey);
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
      setItemAndEncrypt(DRAFT_STORAGE_KEY, drafts, publicKey);
    } catch (err) {
      console.error("Failed to save encrypted draft to localStorage:", err);
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

  // ── Encrypted localStorage delete ─────────────────────────────────────────

  /**
   * Delete a specific draft from encrypted localStorage.
   *
   * @param draftId - ID of draft to delete
   * @param publicKey - Optional Stellar public key
   */
  deleteDraft(draftId: string, publicKey?: string | null): void {
    if (typeof window === "undefined") return;
    try {
      const drafts = this.getAllDrafts(publicKey).filter((d) => d.id !== draftId);
      setItemAndEncrypt(DRAFT_STORAGE_KEY, drafts, publicKey);
    } catch (err) {
      console.error("Failed to delete draft from encrypted localStorage:", err);
    }
  }

  /** Clear all drafts from localStorage */
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
