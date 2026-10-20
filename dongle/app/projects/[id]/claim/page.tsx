"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  Clock,
  Info,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { TextAreaField } from "@/components/ui/TextAreaField";
import WalletGate from "@/components/wallet/WalletGate";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { projectService } from "@/services/project/project.service";
import { projectClaimService } from "@/services/project/project-claim.service";
import {
  ClaimProofType,
  PROJECT_CLAIM_CONSTRAINTS,
  PROJECT_CLAIM_PROOF_OPTIONS,
  ProjectClaimRequest,
} from "@/types/project";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";

// ── Proof-type guidance ────────────────────────────────────────────────────

const PROOF_GUIDANCE: Record<
  ClaimProofType,
  { title: string; hint: string; placeholder: string; steps: string[] }
> = {
  website: {
    title: "Website / Domain Proof",
    hint: "Prove ownership by placing a verification file on your domain.",
    placeholder:
      "https://yourdomain.com/.well-known/dongle-ownership.txt",
    steps: [
      'Create a file at <code class="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">/.well-known/dongle-ownership.txt</code> on your server.',
      'The file must contain exactly: <code class="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">dongle-owner: YOUR_STELLAR_G_ADDRESS</code>',
      "The file must be publicly accessible (no authentication).",
      "Paste the direct URL to the file in the field below.",
    ],
  },
  repository: {
    title: "Repository Proof",
    hint: "Prove ownership by committing a verification file to the project repository.",
    placeholder:
      "https://github.com/your-org/your-repo/blob/main/DONGLE_OWNERSHIP.md",
    steps: [
      'Add a file named <code class="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">DONGLE_OWNERSHIP.md</code> (or <code class="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">.txt</code>) to the root of your repository.',
      "The file should contain your Stellar address and a brief statement of ownership.",
      "The file must be on the default branch and publicly viewable.",
      "Paste the direct link to the file in the field below.",
    ],
  },
  admin_review: {
    title: "Admin Review",
    hint: "Request a manual review if you cannot use a website or repository proof.",
    placeholder:
      "Describe your connection to the project and link any public evidence (social profiles, on-chain activity, etc.)",
    steps: [
      "Provide as much publicly verifiable context as possible.",
      "Include links to your team page, official social accounts, or on-chain transactions.",
      "An admin will review your request and may reach out for more information.",
      "This method takes longer — website/repository proof is preferred.",
    ],
  },
};

// ── Status display helper ──────────────────────────────────────────────────

function ExistingClaimCard({ claim }: { claim: ProjectClaimRequest }) {
  const isApproved = claim.status === "approved";
  const isPending = claim.status === "pending";
  const isRejected = claim.status === "rejected";

  return (
    <div
      className={cn(
        "flex gap-4 p-5 rounded-2xl border",
        isPending &&
          "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50",
        isApproved &&
          "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50",
        isRejected &&
          "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50",
      )}
    >
      {isPending && (
        <Clock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
      )}
      {isApproved && (
        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
      )}
      {isRejected && (
        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      )}

      <div className="space-y-1">
        <p
          className={cn(
            "text-sm font-semibold",
            isPending && "text-yellow-800 dark:text-yellow-200",
            isApproved && "text-green-800 dark:text-green-200",
            isRejected && "text-red-800 dark:text-red-200",
          )}
        >
          {isPending && "Claim pending admin review"}
          {isApproved && "Claim approved — you are the owner"}
          {isRejected && "Claim was not approved"}
        </p>

        <p
          className={cn(
            "text-xs leading-relaxed",
            isPending && "text-yellow-700 dark:text-yellow-300",
            isApproved && "text-green-700 dark:text-green-300",
            isRejected && "text-red-700 dark:text-red-300",
          )}
        >
          {isPending &&
            "Your request has been received. You'll be notified once a decision is made."}
          {isApproved &&
            "Ownership has been transferred to your wallet."}
          {isRejected &&
            (claim.reviewNote
              ? `Reason: ${claim.reviewNote}`
              : "The admin did not approve this ownership claim.")}
        </p>

        <p
          className={cn(
            "text-xs",
            isPending && "text-yellow-600 dark:text-yellow-400",
            isApproved && "text-green-600 dark:text-green-400",
            isRejected && "text-red-600 dark:text-red-400",
          )}
        >
          Submitted {formatDate(claim.createdAt, "relative")}
        </p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const CLAIM_PAGE_PURPOSE =
  "Connect your Freighter wallet to submit an ownership claim for this project.";

export default function ClaimProjectPage() {
  const params = useParams();
  const router = useRouter();
  const gate = useWalletPageGate();
  const projectId = params.id as string;

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [project, setProject] =
    useState<ReturnType<typeof projectService.getProjectById>>(null);
  const [existingClaim, setExistingClaim] =
    useState<ProjectClaimRequest | null>(null);

  // Form state
  const [proofType, setProofType] = useState<ClaimProofType | "">("");
  const [proofValue, setProofValue] = useState("");
  const [explanation, setExplanation] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load project
  useEffect(() => {
    const timer = setTimeout(() => {
      setProject(projectService.getProjectById(projectId));
      setIsPageLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [projectId]);

  // Reload claim status when wallet connects / project loads
  useEffect(() => {
    if (!gate.publicKey || !project) {
      setExistingClaim(null);
      return;
    }
    setExistingClaim(
      projectClaimService.getLatestRequestForUser(project.id, gate.publicKey),
    );
  }, [gate.publicKey, project]);

  const guidance = proofType ? PROOF_GUIDANCE[proofType] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofType) {
      setFieldError("Please select a proof type.");
      return;
    }
    if (!proofValue.trim()) {
      setFieldError("Please provide proof details.");
      return;
    }
    if (!gate.publicKey || !project) return;

    setIsSubmitting(true);
    const result = projectClaimService.createRequest(
      {
        projectId: project.id,
        proofType,
        proofValue,
        explanation,
      },
      gate.publicKey,
    );
    setIsSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      setExistingClaim(
        projectClaimService.getLatestRequestForUser(project.id, gate.publicKey),
      );
      toast.success("Ownership claim submitted successfully");
    } else {
      const msg = result.errors?.[0]?.message ?? "Failed to submit claim";
      toast.error(msg);
    }
  };

  // ── Loading / not-found states ───────────────────────────────────────────

  if (isPageLoading) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <p className="text-zinc-500">Project not found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/discover")}
          >
            Back to Discover
          </Button>
        </div>
      </main>
    );
  }

  // ── Wallet gate ──────────────────────────────────────────────────────────

  if (gate.state !== "ready") {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-xl space-y-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
            <WalletGate gate={gate} pagePurpose={CLAIM_PAGE_PURPOSE} />
          </div>
        </div>
      </main>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────

  if (submitted || existingClaim?.status === "approved") {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle
                className="w-8 h-8 text-green-600"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-bold mb-3">Claim submitted</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-8">
              Your ownership claim for{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {project.name}
              </span>{" "}
              has been received. An admin will review your proof and notify you
              of the decision.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => router.push(`/projects/${projectId}`)}
              >
                Back to project
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/discover")}
              >
                Explore more projects
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Existing pending / rejected claim ────────────────────────────────────

  const canResubmit =
    existingClaim?.status === "rejected";

  // ── Main form ────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 max-w-2xl space-y-6">
        {/* Back */}
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {project.name}
        </button>

        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Claim project</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Submit ownership proof for{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {project.name}
            </span>
            . No private keys or secrets are required.
          </p>
        </div>

        {/* Existing claim status */}
        {existingClaim && !canResubmit && (
          <ExistingClaimCard claim={existingClaim} />
        )}

        {existingClaim && canResubmit && (
          <div className="space-y-3">
            <ExistingClaimCard claim={existingClaim} />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              You can submit a new claim with updated proof below.
            </p>
          </div>
        )}

        {/* Show form only when no pending claim exists */}
        {(!existingClaim || canResubmit) && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
              <ShieldCheck
                className="w-6 h-6 text-blue-600"
                aria-hidden="true"
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Choose proof type */}
              <div className="space-y-2">
                <label
                  htmlFor="proof-type"
                  className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                >
                  1. Choose your proof method
                </label>
                <div className="relative">
                  <select
                    id="proof-type"
                    value={proofType}
                    onChange={(e) => {
                      setProofType(e.target.value as ClaimProofType | "");
                      setProofValue("");
                      if (fieldError) setFieldError("");
                    }}
                    className={cn(
                      "w-full appearance-none bg-zinc-50 dark:bg-zinc-800",
                      "border rounded-xl px-4 py-3 pr-10 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      fieldError && !proofType
                        ? "border-red-400 dark:border-red-600"
                        : "border-zinc-200 dark:border-zinc-700",
                    )}
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
                {fieldError && !proofType && (
                  <p className="text-xs text-red-500">{fieldError}</p>
                )}
              </div>

              {/* Step 2: Proof-type instructions */}
              {guidance && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    2. Follow these steps
                  </p>
                  <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-5 space-y-3">
                    <div className="flex gap-2">
                      <Info
                        className="w-4 h-4 text-blue-500 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {guidance.hint}
                      </p>
                    </div>
                    <ol className="space-y-2 pl-1">
                      {guidance.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <p
                            className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: step }}
                          />
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Step 3: Proof details */}
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  3. Provide your proof
                </p>
                <TextAreaField
                  label="Proof details"
                  value={proofValue}
                  onChange={(e) => {
                    setProofValue(e.target.value);
                    if (fieldError) setFieldError("");
                  }}
                  placeholder={
                    guidance?.placeholder ??
                    "Paste the URL or describe your proof here…"
                  }
                  maxLength={PROJECT_CLAIM_CONSTRAINTS.EXPLANATION_MAX_LENGTH}
                  error={fieldError && proofType ? fieldError : undefined}
                  rows={4}
                />
              </div>

              {/* Optional explanation */}
              <TextAreaField
                label="Additional context (optional)"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Any extra context that may help admins verify your claim…"
                maxLength={PROJECT_CLAIM_CONSTRAINTS.EXPLANATION_MAX_LENGTH}
                rows={3}
              />

              {/* Privacy note */}
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Only share public information. Your Stellar address will be
                visible to admins reviewing this claim. Proof details are
                kept internal to the review process and are not shown publicly.
              </p>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(`/projects/${projectId}`)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Submitting…
                    </>
                  ) : (
                    "Submit Claim"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* How it works sidebar note */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 text-sm space-y-2">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">
            How ownership claims work
          </p>
          <ul className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 list-disc list-inside">
            <li>Submit publicly verifiable proof — no secrets required.</li>
            <li>An admin reviews your proof, typically within 2–5 business days.</li>
            <li>
              If approved, ownership is transferred to your connected wallet.
            </li>
            <li>You'll receive an in-app notification of the decision.</li>
            <li>Rejected claims can be resubmitted with updated proof.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
