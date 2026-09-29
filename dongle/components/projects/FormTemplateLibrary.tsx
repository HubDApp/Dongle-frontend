"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookmarkPlus,
  FileDown,
  LayoutTemplate,
  Search,
  Trash2,
  Eye,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
} from "@/data/form-templates";
import { formTemplateService } from "@/services/form-template/form-template.service";
import type { FormTemplate, FormTemplateCategory } from "@/types/form-template";
import { SaveTemplateModal } from "./SaveTemplateModal";

interface FormTemplateLibraryProps {
  walletAddress?: string | null;
  /** When provided, shows Apply / Create from template actions. */
  onApplyTemplate?: (template: FormTemplate) => void;
  /** Current form values for "Save as template". */
  currentFormData?: FormTemplate["data"];
  /** Compact mode embeds inside ProjectForm. */
  embedded?: boolean;
  className?: string;
}

export function FormTemplateLibrary({
  walletAddress,
  onApplyTemplate,
  currentFormData,
  embedded = false,
  className,
}: FormTemplateLibraryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FormTemplateCategory | "all">("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const templates = useMemo(() => {
    void version;
    return formTemplateService.searchTemplates(query, {
      category,
      walletAddress: walletAddress ?? undefined,
    });
  }, [query, category, walletAddress, version]);

  const preview = previewId
    ? formTemplateService.getTemplateById(previewId, walletAddress ?? undefined)
    : null;

  const handleSave = (name: string, description: string) => {
    if (!walletAddress || !currentFormData) {
      return { success: false, error: "Connect a wallet and fill the form first" };
    }
    const result = formTemplateService.saveAsTemplate(
      walletAddress,
      name,
      currentFormData,
      { description },
    );
    if (result.success) {
      toast.success("Template saved");
      setVersion((v) => v + 1);
    }
    return result;
  };

  const confirmDelete = () => {
    if (!walletAddress || !deleteId) return;
    const ok = formTemplateService.deleteTemplate(walletAddress, deleteId);
    if (ok) {
      toast.success("Template deleted");
      setVersion((v) => v + 1);
      if (previewId === deleteId) setPreviewId(null);
    }
    setDeleteId(null);
  };

  return (
    <div className={className}>
      <Card variant="glass" padding="lg" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <LayoutTemplate className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {embedded ? "Templates" : "Form template library"}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Browse pre-built starters or your saved templates. Preview, then create from a
                template.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentFormData && walletAddress && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<BookmarkPlus className="w-4 h-4" />}
                onClick={() => setSaveOpen(true)}
              >
                Save as template
              </Button>
            )}
            {embedded && (
              <Link href="/projects/templates">
                <Button type="button" variant="ghost" size="sm">
                  Manage all
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label="Search templates"
            />
          </div>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as FormTemplateCategory | "all")
            }
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {TEMPLATE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {templates.length === 0 ? (
              <p className="text-sm text-zinc-500 py-8 text-center">No templates match your search.</p>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setPreviewId(template.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    previewId === template.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{template.name}</span>
                        {template.isBuiltIn ? (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-semibold inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Built-in
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
                            Saved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                        {template.description || TEMPLATE_CATEGORY_LABELS[template.category]}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {TEMPLATE_CATEGORY_LABELS[template.category]}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 min-h-[220px] bg-zinc-50/50 dark:bg-zinc-900/40">
            {preview ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-zinc-400" />
                    <h4 className="font-semibold">{preview.name}</h4>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {preview.description || "No description"}
                  </p>
                </div>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Category</dt>
                    <dd className="font-medium">
                      {preview.data.primaryCategory || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Tags</dt>
                    <dd className="font-medium text-right">
                      {(preview.data.tags ?? []).join(", ") || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 mb-1">Description preview</dt>
                    <dd className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-4 whitespace-pre-wrap">
                      {preview.data.description || "—"}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 pt-2">
                  {onApplyTemplate && (
                    <Button
                      type="button"
                      size="sm"
                      leftIcon={<FileDown className="w-4 h-4" />}
                      onClick={() => {
                        onApplyTemplate(preview);
                        toast.success(`Loaded “${preview.name}”`);
                      }}
                    >
                      Create from template
                    </Button>
                  )}
                  {!preview.isBuiltIn && walletAddress && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={() => setDeleteId(preview.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 h-full flex items-center justify-center">
                Select a template to preview
              </p>
            )}
          </div>
        </div>
      </Card>

      <SaveTemplateModal
        isOpen={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Delete template"
        description="Are you sure you want to delete this saved template? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
