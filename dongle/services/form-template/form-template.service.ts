/**
 * Form template service — local persistence + optional remote sync.
 *
 * User templates are stored per-wallet in localStorage and mirrored to
 * /api/templates (in-memory DB stand-in, same pattern as drafts).
 */

import { MAX_FORM_TEMPLATES } from "@/constants/limits";
import { BUILT_IN_FORM_TEMPLATES } from "@/data/form-templates";
import type {
  FormTemplate,
  FormTemplateCategory,
  FormTemplateData,
  FormTemplatePreview,
} from "@/types/form-template";
import { formTemplateApiService } from "./form-template-api.service";

const STORAGE_PREFIX = "dongle_form_templates:";

function getStorageKey(walletAddress: string) {
  return `${STORAGE_PREFIX}${walletAddress}`;
}

function readUserTemplates(walletAddress: string): FormTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FormTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeUserTemplates(walletAddress: string, templates: FormTemplate[]) {
  localStorage.setItem(
    getStorageKey(walletAddress),
    JSON.stringify(templates.slice(0, MAX_FORM_TEMPLATES)),
  );
}

function countFilledFields(data: FormTemplateData): number {
  let count = 0;
  if (data.name?.trim()) count++;
  if (data.primaryCategory?.trim()) count++;
  if (data.description?.trim()) count++;
  if (data.websiteUrl?.trim()) count++;
  if (data.githubUrl?.trim()) count++;
  if (data.logoUrl?.trim()) count++;
  if (data.docsUrl?.trim()) count++;
  if (data.auditReportUrl?.trim()) count++;
  if (data.bugBountyUrl?.trim()) count++;
  if ((data.tags ?? []).length > 0) count++;
  if ((data.contractAddresses ?? []).some((a) => a.trim())) count++;
  return count;
}

function toPreview(template: FormTemplate): FormTemplatePreview {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    isBuiltIn: Boolean(template.isBuiltIn),
    fieldCount: countFilledFields(template.data),
    tags: template.data.tags ?? [],
  };
}

function inferCategory(primaryCategory: string): FormTemplateCategory {
  const value = primaryCategory.trim().toLowerCase();
  if (
    value === "defi" ||
    value === "gaming" ||
    value === "infrastructure" ||
    value === "payments" ||
    value === "dao"
  ) {
    return value;
  }
  return "general";
}

export const formTemplateService = {
  getBuiltInTemplates(): FormTemplate[] {
    return BUILT_IN_FORM_TEMPLATES.map((t) => ({ ...t, data: { ...t.data } }));
  },

  getUserTemplates(walletAddress: string): FormTemplate[] {
    if (!walletAddress) return [];
    return readUserTemplates(walletAddress);
  },

  getAllTemplates(walletAddress?: string): FormTemplate[] {
    const builtIn = this.getBuiltInTemplates();
    const user = walletAddress ? this.getUserTemplates(walletAddress) : [];
    return [...builtIn, ...user];
  },

  getTemplateById(id: string, walletAddress?: string): FormTemplate | null {
    const builtIn = BUILT_IN_FORM_TEMPLATES.find((t) => t.id === id);
    if (builtIn) return { ...builtIn, data: { ...builtIn.data } };
    if (!walletAddress) return null;
    return readUserTemplates(walletAddress).find((t) => t.id === id) ?? null;
  },

  searchTemplates(
    query: string,
    options?: {
      category?: FormTemplateCategory | "all";
      walletAddress?: string;
      builtInOnly?: boolean;
      userOnly?: boolean;
    },
  ): FormTemplate[] {
    const q = query.trim().toLowerCase();
    const category = options?.category ?? "all";

    let templates = this.getAllTemplates(options?.walletAddress);
    if (options?.builtInOnly) {
      templates = templates.filter((t) => t.isBuiltIn);
    }
    if (options?.userOnly) {
      templates = templates.filter((t) => !t.isBuiltIn);
    }
    if (category !== "all") {
      templates = templates.filter((t) => t.category === category);
    }
    if (!q) return templates;

    return templates.filter((t) => {
      const haystack = [
        t.name,
        t.description ?? "",
        t.category,
        ...(t.data.tags ?? []),
        t.data.primaryCategory,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  },

  listPreviews(
    walletAddress?: string,
    options?: { category?: FormTemplateCategory | "all"; query?: string },
  ): FormTemplatePreview[] {
    return this.searchTemplates(options?.query ?? "", {
      category: options?.category,
      walletAddress,
    }).map(toPreview);
  },

  saveAsTemplate(
    walletAddress: string,
    name: string,
    data: FormTemplateData,
    options?: { description?: string; category?: FormTemplateCategory },
  ): { success: boolean; data?: FormTemplate; error?: string } {
    if (!walletAddress) {
      return { success: false, error: "Wallet address is required" };
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return { success: false, error: "Template name must be at least 2 characters" };
    }

    const existing = readUserTemplates(walletAddress);
    if (existing.length >= MAX_FORM_TEMPLATES) {
      return {
        success: false,
        error: `Maximum ${MAX_FORM_TEMPLATES} templates allowed`,
      };
    }

    const now = new Date().toISOString();
    const entry: FormTemplate = {
      id: crypto.randomUUID(),
      name: trimmed,
      description: options?.description?.trim() || undefined,
      category: options?.category ?? inferCategory(data.primaryCategory),
      data: {
        ...data,
        tags: [...(data.tags ?? [])],
        contractAddresses: [...(data.contractAddresses ?? [])],
      },
      isBuiltIn: false,
      walletAddress,
      createdAt: now,
      updatedAt: now,
    };

    writeUserTemplates(walletAddress, [entry, ...existing]);

    // Fire-and-forget remote persistence ("stored in database")
    void formTemplateApiService.saveTemplate(walletAddress, entry);

    return { success: true, data: entry };
  },

  updateTemplate(
    walletAddress: string,
    templateId: string,
    updates: Partial<Pick<FormTemplate, "name" | "description" | "category" | "data">>,
  ): FormTemplate | null {
    const templates = readUserTemplates(walletAddress);
    const index = templates.findIndex((t) => t.id === templateId);
    if (index === -1) return null;

    templates[index] = {
      ...templates[index],
      ...updates,
      data: updates.data
        ? {
            ...updates.data,
            tags: [...(updates.data.tags ?? [])],
            contractAddresses: [...(updates.data.contractAddresses ?? [])],
          }
        : templates[index].data,
      updatedAt: new Date().toISOString(),
    };
    writeUserTemplates(walletAddress, templates);
    void formTemplateApiService.saveTemplate(walletAddress, templates[index]);
    return templates[index];
  },

  deleteTemplate(walletAddress: string, templateId: string): boolean {
    const current = readUserTemplates(walletAddress);
    const next = current.filter((t) => t.id !== templateId);
    if (next.length === current.length) return false;
    writeUserTemplates(walletAddress, next);
    void formTemplateApiService.deleteTemplate(walletAddress, templateId);
    return true;
  },

  /** Merge remote templates into local storage (latest updatedAt wins). */
  async syncFromRemote(walletAddress: string): Promise<FormTemplate[]> {
    const remote = await formTemplateApiService.listTemplates(walletAddress);
    if (!remote.ok) {
      return readUserTemplates(walletAddress);
    }

    const local = readUserTemplates(walletAddress);
    const byId = new Map<string, FormTemplate>();
    for (const t of local) byId.set(t.id, t);
    for (const t of remote.data) {
      const existing = byId.get(t.id);
      if (!existing || existing.updatedAt < t.updatedAt) {
        byId.set(t.id, t);
      }
    }
    const merged = Array.from(byId.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    writeUserTemplates(walletAddress, merged);
    return merged;
  },
};
