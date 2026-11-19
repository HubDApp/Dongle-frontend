"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { gdprService } from "@/services/gdpr/gdpr.service";
import { Button } from "@/components/ui/Button";
import { Download, FileJson } from "lucide-react";

interface GDPRDataExportProps {
  formType: string;
  formId: string;
  userId: string;
  formData?: Record<string, unknown>;
}

export function GDPRDataExport({
  formType,
  formId,
  userId,
  formData,
}: GDPRDataExportProps) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [includeAttribution, setIncludeAttribution] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`dongle_export_attribution_${userId}`);
    setIncludeAttribution(stored === "true");
  }, [userId]);

  const toggleAttribution = (checked: boolean) => {
    setIncludeAttribution(checked);
    localStorage.setItem(`dongle_export_attribution_${userId}`, String(checked));
  };

  const handleExport = useCallback(() => {
    setExporting(true);
    try {
      const result = gdprService.exportUserData(formType, formId, userId, formData, includeAttribution);
      gdprService.downloadExport(result);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error("[GDPRDataExport] Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [formType, formId, userId, formData, includeAttribution]);

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeAttribution}
          onChange={(event) => toggleAttribution(event.target.checked)}
          className="mt-1"
        />
        <span>
          Include my data attribution
          {includeAttribution ? (
            <span className="mt-1 block text-xs font-semibold text-amber-700 dark:text-amber-400">
              Warning: Data will not be anonymized
            </span>
          ) : null}
        </span>
      </label>
      <p className="text-xs text-zinc-500">
        Export is private and not shared. Only your own data is attributed; other users remain anonymized.
      </p>
      <p className="text-xs text-zinc-500">
        GDPR notice: this export contains personal data and is generated for you to download and manage.
      </p>
      <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleExport}
        isLoading={exporting}
        disabled={exporting}
        leftIcon={<FileJson className="w-4 h-4" />}
      >
        {exporting
          ? t("gdpr.export.exporting")
          : exported
            ? t("gdpr.export.exported")
            : t("gdpr.export.button")}
      </Button>
      </div>
    </div>
  );
}
