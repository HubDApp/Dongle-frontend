"use client";

import React, { useState, useCallback } from "react";
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

  const handleExport = useCallback(() => {
    setExporting(true);
    try {
      const result = gdprService.exportUserData(formType, formId, userId, formData);
      gdprService.downloadExport(result);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error("[GDPRDataExport] Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [formType, formId, userId, formData]);

  return (
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
  );
}
