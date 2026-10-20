"use client";

/**
 * Structured evidence templates for verification requests (#686).
 *
 * Provides template selector and per-template required field validation
 * so verification requests are consistent and admins see structured evidence.
 */

import React from "react";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FileText, ShieldCheck, Code, Globe } from "lucide-react";

export type EvidenceTemplate =
  | "audit_report"
  | "kyc"
  | "code_review"
  | "testnet_proof";

export interface TemplateField {
  name: string;
  label: string;
  type: "text" | "url" | "date";
  required: boolean;
  placeholder?: string;
}

export interface TemplateConfig {
  id: EvidenceTemplate;
  label: string;
  description: string;
  icon: React.ReactNode;
  fields: TemplateField[];
}

export const EVIDENCE_TEMPLATES: Record<EvidenceTemplate, TemplateConfig> = {
  audit_report: {
    id: "audit_report",
    label: "Audit Report",
    description: "Third-party security audit report",
    icon: <ShieldCheck className="h-5 w-5" />,
    fields: [
      { name: "auditor_name", label: "Auditor Name", type: "text", required: true, placeholder: "e.g. CertiK" },
      { name: "report_date", label: "Report Date", type: "date", required: true },
      { name: "report_url", label: "Report URL", type: "url", required: true, placeholder: "https://..." },
    ],
  },
  kyc: {
    id: "kyc",
    label: "KYC Verification",
    description: "Know Your Customer verification",
    icon: <FileText className="h-5 w-5" />,
    fields: [
      { name: "kyc_service", label: "KYC Service", type: "text", required: true, placeholder: "e.g. Jumio, Onfido" },
      { name: "verification_id", label: "Verification ID", type: "text", required: true },
      { name: "verification_date", label: "Verification Date", type: "date", required: true },
    ],
  },
  code_review: {
    id: "code_review",
    label: "Code Review",
    description: "GitHub pull request code review",
    icon: <Code className="h-5 w-5" />,
    fields: [
      { name: "github_pr", label: "GitHub PR URL", type: "url", required: true, placeholder: "https://github.com/..." },
      { name: "reviewer", label: "Reviewer", type: "text", required: true },
      { name: "review_date", label: "Review Date", type: "date", required: true },
    ],
  },
  testnet_proof: {
    id: "testnet_proof",
    label: "Testnet Proof",
    description: "On-chain testnet transaction proof",
    icon: <Globe className="h-5 w-5" />,
    fields: [
      { name: "tx_hash", label: "Transaction Hash", type: "text", required: true },
      { name: "proof_date", label: "Date", type: "date", required: true },
    ],
  },
};

interface EvidenceTemplatesProps {
  selectedTemplate: EvidenceTemplate | null;
  onSelect: (template: EvidenceTemplate) => void;
  evidenceData: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  errors: Record<string, string>;
}

export function EvidenceTemplates({
  selectedTemplate,
  onSelect,
  evidenceData,
  onFieldChange,
  errors,
}: EvidenceTemplatesProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Evidence Template
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.values(EVIDENCE_TEMPLATES) as TemplateConfig[]).map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl.id)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                selectedTemplate === tpl.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mt-0.5 text-indigo-600">{tpl.icon}</span>
              <div>
                <p className="font-medium text-sm">{tpl.label}</p>
                <p className="text-xs text-gray-500">{tpl.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedTemplate && (
        <Card className="p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {EVIDENCE_TEMPLATES[selectedTemplate].label} — Required Fields
          </p>
          <div className="space-y-3">
            {EVIDENCE_TEMPLATES[selectedTemplate].fields.map((field) => (
              <FormField
                key={field.name}
                label={field.label}
                required={field.required}
                error={errors[field.name]}
              >
                <input
                  type={field.type}
                  value={evidenceData[field.name] ?? ""}
                  onChange={(e) => onFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </FormField>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/** Validate that all required fields for the selected template are filled. */
export function validateEvidence(
  template: EvidenceTemplate,
  data: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const config = EVIDENCE_TEMPLATES[template];

  for (const field of config.fields) {
    if (field.required && !data[field.name]?.trim()) {
      errors[field.name] = `${field.label} is required`;
    }
    if (field.type === "url" && data[field.name] && !data[field.name].startsWith("http")) {
      errors[field.name] = "Must be a valid URL";
    }
  }

  return errors;
}
