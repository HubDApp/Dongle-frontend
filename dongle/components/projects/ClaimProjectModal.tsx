"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { cn } from "@/lib/utils";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { PROJECT_CLAIM_CONSTRAINTS, PROJECT_CLAIM_PROOF_OPTIONS } from "@/types/project";

interface ClaimProjectModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
  onSubmit: (data: { proofType: string; proofValue: string; explanation: string }) => void;
}

export function ClaimProjectModal({
  isOpen,
  projectName,
  onClose,
  onSubmit,
}: ClaimProjectModalProps) {
  const [proofType, setProofType] = useState("");
  const [proofValue, setProofValue] = useState("");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      setProofType("");
      setProofValue("");
      setExplanation("");
      setError("");
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  useModalFocusTrap(isOpen, dialogRef, initialFocusRef, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofType) {
      setError("Please select a proof type.");
      return;
    }
    if (!proofValue.trim()) {
      setError("Please provide proof details.");
      return;
    }
    onSubmit({ proofType, proofValue, explanation });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-md bg-white dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl",
          "p-8"
        )}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-blue-100 dark:bg-blue-900/30">
          <ShieldCheck className="w-6 h-6 text-blue-600" aria-hidden="true" />
        </div>

        <h2 id="claim-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Claim {projectName}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          Submit ownership proof for this project. Share only the public proof details you want reviewed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField
            ref={initialFocusRef}
            label="Proof type"
            value={proofType}
            onChange={(e) => {
              setProofType(e.target.value);
              if (error) setError("");
            }}
            options={PROJECT_CLAIM_PROOF_OPTIONS}
            error={error}
          />

          <TextAreaField
            label="Proof details"
            value={proofValue}
            onChange={(e) => setProofValue(e.target.value)}
            placeholder="Example: https://yourdomain.com/ownership-verification or repo URL with proof"
            maxLength={PROJECT_CLAIM_CONSTRAINTS.EXPLANATION_MAX_LENGTH}
          />

          <TextAreaField
            label="Additional explanation (optional)"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Add context for admins"
            maxLength={PROJECT_CLAIM_CONSTRAINTS.EXPLANATION_MAX_LENGTH}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Submit Claim
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
