"use client";

import React, { useId, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  FORM_EXPORT_FORMATS,
  exportFormData,
  type FormExportFormat,
  type FormExportOptions,
  type FormExportRecord,
} from "@/lib/form-export";
import { logger } from "@/lib/logger";

interface FormExportMenuProps extends FormExportOptions {
  /** Called at click time so the export reflects the latest form values. */
  getData: () => FormExportRecord | FormExportRecord[];
  /** Filename stem; the date and extension are appended. */
  filename?: string;
  defaultFormat?: FormExportFormat;
  disabled?: boolean;
  className?: string;
}

export function FormExportMenu({
  getData,
  filename = "form-data",
  defaultFormat = "csv",
  disabled = false,
  className = "",
  ...exportOptions
}: FormExportMenuProps) {
  const [format, setFormat] = useState<FormExportFormat>(defaultFormat);
  const [status, setStatus] = useState<string>("");
  const selectId = useId();

  const handleExport = () => {
    try {
      const saved = exportFormData(getData(), format, filename, exportOptions);
      setStatus(`Exported ${saved}`);
    } catch (error) {
      logger.error("Form export failed", error);
      setStatus("Export failed. Please try again.");
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <label htmlFor={selectId} className="sr-only">
        Export format
      </label>
      <select
        id={selectId}
        value={format}
        onChange={(e) => setFormat(e.target.value as FormExportFormat)}
        disabled={disabled}
        className="text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
      >
        {FORM_EXPORT_FORMATS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={disabled}
        leftIcon={<Download className="w-4 h-4" />}
      >
        Export data
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {status}
      </span>
    </div>
  );
}

export default FormExportMenu;
