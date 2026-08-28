"use client";

import React from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { cn } from "@/lib/utils";
import { useModalForm } from "@/hooks/useModalForm";
import { PROJECT_REPORT_REASONS, PROJECT_REPORT_CONSTRAINTS } from "@/types/project";

interface ReportProjectModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
  onSubmit: (data: { reason: string; explanation: string }) => void;
}

export function ReportProjectModal({
  isOpen,
  projectName,
  onClose,
  onSubmit,
}: ReportProjectModalProps) {
  const { values, setField, error, setError, dialogRef, initialFocusRef } =
    useModalForm({
      isOpen,
      onClose,
      initialValues: { reason: "", explanation: "" },
    });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.reason) {
      setError("Please select a reason for reporting.");
      return;
    }
    onSubmit({ reason: values.reason, explanation: values.explanation });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-md bg-white dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl",
          "p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        )}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-red-100 dark:bg-red-900/30">
          <Flag className="w-6 h-6 text-red-500" aria-hidden="true" />
        </div>

        <h2 id="report-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Report {projectName}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          Please provide details about why you are reporting this project. Your report will be reviewed by our team.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField
            ref={initialFocusRef}
            label="Reason for reporting"
            value={values.reason}
            onChange={(e) => setField("reason", e.target.value)}
            options={PROJECT_REPORT_REASONS}
            error={error}
          />

          <TextAreaField
            label="Additional explanation (optional)"
            value={values.explanation}
            onChange={(e) => setField("explanation", e.target.value)}
            placeholder="Provide any additional context or links..."
            maxLength={PROJECT_REPORT_CONSTRAINTS.EXPLANATION_MAX_LENGTH}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="error">
              Submit Report
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
