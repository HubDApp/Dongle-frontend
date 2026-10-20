"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { cn } from "@/lib/utils";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { OwnershipVerificationPanel } from "@/components/projects/OwnershipVerificationPanel";
import {
  ClaimProofType,
  PROJECT_CLAIM_CONSTRAINTS,
  PROJECT_CLAIM_PROOF_OPTIONS,
} from "@/types/project";

// ── Proof-type guidance copy ───────────────────────────────────────────────

const PROOF_GUIDANCE: Record<
  ClaimProofType,
  { placeholder: string; hint: string }
> = {
  website: {
    placeholder: "e.g. https://yourdomain.com",
    hint: "Verify this domain with the generated DNS TXT or Stellar.toml token above, then enter the verified domain here.",
  },
  repository: {
    placeholder: "e.g. https://github.com/your-org/your-repo",
    hint: "Verify this repository by adding the generated token to its root dongle-verify.txt file, then enter the repository URL here.",
  },
  admin_review: {
    placeholder:
      "Describe how you can prove ownership (team links, social handles, on-chain activity, etc.)",
    hint:
      "Provide as much public context as possible — links to your team page, official social accounts, " +
      "on-chain transaction history, or any other publicly verifiable evidence. " +
      "An admin will review your request and may reach out for more information.",
  },
};

// ── Component ──────────────────────────────────────────────────────────────

interface ClaimProjectModalProps {
  isOpen: boolean;
  projectName: string;
  projectId?: string;
  walletAddress?: string | null;
  onClose: () => void;
  onSubmit: (data: {
    proofType: string;
    proofValue: string;
    explanation: string;
  }) => void;
}

export function ClaimProjectModal({
  isOpen,
  projectName,
  projectId,
  walletAddress,
  onClose,
  onSubmit,
}: ClaimProjectModalProps) {
  const [proofType, setProofType] = useState<ClaimProofType | "">("");
  const [proofValue, setProofValue] = useState("");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const [ownershipVerified, setOwnershipVerified] = useState(false);
  const handleVerificationStatus = useCallback((verified: boolean) => {
    setOwnershipVerified(verified);
  }, []);

  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLSelectElement>(null);

  // Reset form state whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      setProofType("");
      setProofValue("");
      setExplanation("");
      setError("");
      setOwnershipVerified(false);
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  useModalFocusTrap(isOpen, dialogRef, initialFocusRef, onClose);

  if (!isOpen) return null;

  const guidance = proofType ? PROOF_GUIDANCE[proofType] : null;

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
    if (projectId && walletAddress && proofType !== "admin_review" && !ownershipVerified) {
      setError("Verify ownership with DNS, GitHub, or Stellar.toml before submitting this claim.");
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
          "relative w-full max-w-lg bg-white dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl",
          "p-8 max-h-[90vh] overflow-y-auto",
        )}
      >
        {/* Icon + heading */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-blue-100 dark:bg-blue-900/30">
          <ShieldCheck
            className="w-6 h-6 text-blue-600"
            aria-hidden="true"
          />
        </div>

        <h2
          id="claim-dialog-title"
          className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2"
        >
          Claim {projectName}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          Provide publicly verifiable proof that you own or represent this
          project. No private keys or secrets are required.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {projectId && walletAddress && (
            <OwnershipVerificationPanel
              projectId={projectId}
              walletAddress={walletAddress}
              onVerifiedChange={handleVerificationStatus}
            />
          )}
          {/* Proof type selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="claim-proof-type"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Proof type
            </label>
            <div className="relative">
              <select
                id="claim-proof-type"
                ref={initialFocusRef}
                value={proofType}
                onChange={(e) => {
                  setProofType(e.target.value as ClaimProofType | "");
                  setProofValue("");
                  if (error) setError("");
                }}
                className={cn(
                  "w-full appearance-none bg-zinc-50 dark:bg-zinc-800",
                  "border rounded-xl px-4 py-2.5 pr-10 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  error && !proofType
                    ? "border-red-400 dark:border-red-600"
                    : "border-zinc-200 dark:border-zinc-700",
                )}
                aria-describedby={error && !proofType ? "claim-error" : undefined}
              >
                <option value="">Select proof type…</option>
                {PROJECT_CLAIM_PROOF_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
                aria-hidden="true"
              />
            </div>
            {error && !proofType && (
              <p id="claim-error" className="text-xs text-red-500 mt-1">
                {error}
              </p>
            )}
          </div>

          {/* Contextual guidance for the chosen proof type */}
          {guidance && (
            <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl">
              <Info
                className="w-4 h-4 text-blue-500 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p
                className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: guidance.hint }}
              />
            </div>
          )}

          {/* Proof details */}
          <TextAreaField
            label="Proof details"
            value={proofValue}
            onChange={(e) => {
              setProofValue(e.target.value);
              if (error) setError("");
            }}
            placeholder={
              guidance?.placeholder ??
              "Paste the URL or describe your proof here…"
            }
            maxLength={PROJECT_CLAIM_CONSTRAINTS.EXPLANATION_MAX_LENGTH}
            error={error && proofType ? error : undefined}
          />

          {/* Optional explanation */}
          <TextAreaField
            label="Additional context (optional)"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Any extra context that may help admins verify your claim…"
            maxLength={PROJECT_CLAIM_CONSTRAINTS.EXPLANATION_MAX_LENGTH}
          />

          {/* Privacy note */}
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Only share public information. Your Stellar address will be visible
            to admins but proof details are kept internal to the review process.
          </p>

          <div className="flex gap-3 justify-end pt-2">
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
