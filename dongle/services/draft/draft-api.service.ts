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
import { getJson, mutate } from "@/lib/data-layer";
import { nowUTC } from "@/lib/dates";

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
      const result = await getJson<ProjectDraft>({
        method: "GET",
        url: this.url(walletAddress, draftId),
        headers: { "Content-Type": "application/json" },
        tags: ["drafts"],
        persist: true,
      });

      if (!result.ok) {
        return {
          ok: false,
          error: result.error ?? "Request failed",
          status: result.status,
        };
      }

      return { ok: true, data: result.data as ProjectDraft };
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
   * When offline, the write is queued and replayed after reconnect.
   */
  async saveDraft(
    walletAddress: string,
    draft: Omit<ProjectDraft, "lastSaved">
  ): Promise<ApiResult<ProjectDraft>> {
    try {
      const { id, ...body } = draft;
      const result = await mutate<ProjectDraft>({
        method: "PUT",
        url: this.url(walletAddress, id),
        headers: { "Content-Type": "application/json" },
        body,
        invalidateTags: ["drafts"],
        invalidatePrefixes: [`GET:${this.baseUrl()}`],
        queueWhenOffline: true,
        mutationType: "drafts.save",
        idempotencyKey: `drafts.save|${walletAddress}|${id}`,
      });

      if (result.queued) {
        return {
          ok: true,
          data: { ...draft, lastSaved: nowUTC() },
        };
      }

      if (!result.ok) {
        return {
          ok: false,
          error: result.error ?? "Request failed",
          status: result.status,
        };
      }

      return { ok: true, data: result.data as ProjectDraft };
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
      const result = await mutate<{ success: boolean }>({
        method: "DELETE",
        url: this.url(walletAddress, draftId),
        invalidateTags: ["drafts"],
        invalidatePrefixes: [`GET:${this.baseUrl()}`],
        queueWhenOffline: true,
        mutationType: "drafts.delete",
        idempotencyKey: `drafts.delete|${walletAddress}|${draftId}`,
      });

      if (result.queued) {
        return { ok: true, data: { success: true } };
      }

      if (!result.ok) {
        return {
          ok: false,
          error: result.error ?? "Request failed",
          status: result.status,
        };
      }

      return { ok: true, data: result.data ?? { success: true } };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }
}

export const draftApiService = new DraftApiService();
