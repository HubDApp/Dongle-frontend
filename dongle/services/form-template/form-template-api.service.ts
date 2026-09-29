/**
 * Form template API client — syncs user templates with /api/templates.
 */

import type { FormTemplate } from "@/types/form-template";

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

class FormTemplateApiService {
  private baseUrl(): string {
    if (typeof window !== "undefined") {
      return "/api/templates";
    }
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      `http://localhost:${process.env.PORT ?? 3000}`;
    return `${origin}/api/templates`;
  }

  private collectionUrl(walletAddress: string): string {
    return `${this.baseUrl()}/${encodeURIComponent(walletAddress)}`;
  }

  private itemUrl(walletAddress: string, templateId: string): string {
    return `${this.collectionUrl(walletAddress)}/${encodeURIComponent(templateId)}`;
  }

  async listTemplates(walletAddress: string): Promise<ApiResult<FormTemplate[]>> {
    try {
      const res = await fetch(this.collectionUrl(walletAddress), {
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
      const data = (await res.json()) as FormTemplate[];
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async saveTemplate(
    walletAddress: string,
    template: FormTemplate,
  ): Promise<ApiResult<FormTemplate>> {
    try {
      const res = await fetch(this.itemUrl(walletAddress, template.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: (body as { error?: string }).error ?? res.statusText,
          status: res.status,
        };
      }
      const data = (await res.json()) as FormTemplate;
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async deleteTemplate(
    walletAddress: string,
    templateId: string,
  ): Promise<ApiResult<{ success: boolean }>> {
    try {
      const res = await fetch(this.itemUrl(walletAddress, templateId), {
        method: "DELETE",
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
      return { ok: true, data: { success: true } };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }
}

export const formTemplateApiService = new FormTemplateApiService();
