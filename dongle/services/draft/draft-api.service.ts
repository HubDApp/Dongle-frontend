/**
 * DraftApiService
 *
 * Client-side service that communicates with the
 * /api/drafts/[walletAddress]/[draftId] route.
 *
 * All methods return a typed result object so callers can distinguish
 * between a successful response and a network/server error without
 * throwing.
 */

import type { ProjectDraft } from "@/services/draft/draft.service";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  status?: number;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class DraftApiService {
  private baseUrl(): string {
    // Works in both the browser (relative path) and SSR (absolute path via env)
    if (typeof window !== "undefined") {
      return "/api/drafts";
    }
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      `http://localhost:${process.env.PORT ?? 3000}`;
    return `${origin}/api/drafts`;
  }

  private url(walletAddress: string, draftId: string): string {
    return `${this.baseUrl()}/${encodeURIComponent(walletAddress)}/${encodeURIComponent(draftId)}`;
  }

  /**
   * Retrieve a single draft from the API.
   */
  async getDraft(
    walletAddress: string,
    draftId: string
  ): Promise<ApiResult<ProjectDraft>> {
    try {
      const res = await fetch(this.url(walletAddress, draftId), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (body as { error?: string }).error ?? res.statusText,
          status: res.status,
        };
      }

      const data = (await res.json()) as ProjectDraft;
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  /**
   * Create or update a draft on the API.
   * Returns the persisted draft (with server-assigned lastSaved timestamp).
   */
  async saveDraft(
    walletAddress: string,
    draft: Omit<ProjectDraft, "lastSaved">
  ): Promise<ApiResult<ProjectDraft>> {
    try {
      const { id, ...body } = draft;
      const res = await fetch(this.url(walletAddress, id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (errBody as { error?: string }).error ?? res.statusText,
          status: res.status,
        };
      }

      const data = (await res.json()) as ProjectDraft;
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  /**
   * Delete a draft from the API.
   */
  async deleteDraft(
    walletAddress: string,
    draftId: string
  ): Promise<ApiResult<{ success: boolean }>> {
    try {
      const res = await fetch(this.url(walletAddress, draftId), {
        method: "DELETE",
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (errBody as { error?: string }).error ?? res.statusText,
          status: res.status,
        };
      }

      const data = (await res.json()) as { success: boolean };
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }
}

export const draftApiService = new DraftApiService();
