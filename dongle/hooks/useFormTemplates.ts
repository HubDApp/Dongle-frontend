"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formTemplateService } from "@/services/form-template/form-template.service";
import type {
  FormTemplate,
  FormTemplateCategory,
  FormTemplateData,
} from "@/types/form-template";

interface UseFormTemplatesOptions {
  walletAddress?: string | null;
  autoSync?: boolean;
}

export function useFormTemplates({
  walletAddress,
  autoSync = true,
}: UseFormTemplatesOptions = {}) {
  const [userTemplates, setUserTemplates] = useState<FormTemplate[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!walletAddress) {
      setUserTemplates([]);
      return;
    }
    setUserTemplates(formTemplateService.getUserTemplates(walletAddress));
  }, [walletAddress]);

  const sync = useCallback(async () => {
    if (!walletAddress) return;
    setIsSyncing(true);
    setError(null);
    try {
      const merged = await formTemplateService.syncFromRemote(walletAddress);
      setUserTemplates(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync templates");
      refresh();
    } finally {
      setIsSyncing(false);
    }
  }, [walletAddress, refresh]);

  useEffect(() => {
    refresh();
    if (autoSync && walletAddress) {
      void sync();
    }
  }, [walletAddress, autoSync, refresh, sync]);

  const builtInTemplates = useMemo(
    () => formTemplateService.getBuiltInTemplates(),
    [],
  );

  const saveTemplate = useCallback(
    (
      name: string,
      data: FormTemplateData,
      options?: { description?: string; category?: FormTemplateCategory },
    ) => {
      if (!walletAddress) {
        return { success: false as const, error: "Connect a wallet to save templates" };
      }
      const result = formTemplateService.saveAsTemplate(
        walletAddress,
        name,
        data,
        options,
      );
      if (result.success) refresh();
      return result;
    },
    [walletAddress, refresh],
  );

  const deleteTemplate = useCallback(
    (templateId: string) => {
      if (!walletAddress) return false;
      const ok = formTemplateService.deleteTemplate(walletAddress, templateId);
      if (ok) refresh();
      return ok;
    },
    [walletAddress, refresh],
  );

  const loadTemplate = useCallback(
    (templateId: string): FormTemplate | null => {
      return formTemplateService.getTemplateById(
        templateId,
        walletAddress ?? undefined,
      );
    },
    [walletAddress],
  );

  const search = useCallback(
    (query: string, category: FormTemplateCategory | "all" = "all") => {
      return formTemplateService.searchTemplates(query, {
        category,
        walletAddress: walletAddress ?? undefined,
      });
    },
    [walletAddress],
  );

  return {
    builtInTemplates,
    userTemplates,
    isSyncing,
    error,
    refresh,
    sync,
    saveTemplate,
    deleteTemplate,
    loadTemplate,
    search,
  };
}
