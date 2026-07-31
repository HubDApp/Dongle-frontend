import React from "react";
import { AlertCircle, Info, Clock } from "lucide-react";

export type ProjectVerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

interface ProjectStatusBannerProps {
  status: ProjectVerificationStatus | null;
}

/**
 * Displays a contextual page-level warning banner based on a project's
 * verification status.
 *
 * - VERIFIED → renders nothing (no unnecessary noise for trusted projects).
 * - NONE     → amber informational banner (not alarming, just context).
 * - PENDING  → amber informational banner, distinct copy noting review is in
 *              progress so the outcome is still unknown.
 * - REJECTED → red warning banner with stronger language.
 */
export function ProjectStatusBanner({ status }: ProjectStatusBannerProps) {
  if (!status || status === "VERIFIED") return null;

  if (status === "REJECTED") {
    return (
      <div
        role="alert"
        className="mb-6 p-5 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-3xl border border-red-200 dark:border-red-900/50 shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <AlertCircle
          className="w-6 h-6 shrink-0 mt-0.5 text-red-600 dark:text-red-400"
          aria-hidden="true"
        />
        <div>
          <h4 className="font-bold text-base mb-1">
            High Risk Warning: Rejected Project
          </h4>
          <p className="text-sm opacity-90 leading-relaxed">
            This project was rejected by the community verification process.
            Please be extremely cautious: do not connect your wallet, share
            private keys, or interact with external links unless you are
            absolutely sure of its safety.
          </p>
        </div>
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div
        role="status"
        className="mb-6 p-5 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <Clock
          className="w-6 h-6 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <div>
          <h4 className="font-bold text-base mb-1">
            Verification Pending
          </h4>
          <p className="text-sm opacity-90 leading-relaxed">
            This project has submitted a verification request and is currently
            under review. It has not yet been approved. Please exercise due
            diligence when interacting with external resources until verification
            is complete.
          </p>
        </div>
      </div>
    );
  }

  // status === "NONE"
  return (
    <div
      role="status"
      className="mb-6 p-5 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <Info
        className="w-6 h-6 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
      <div>
        <h4 className="font-bold text-base mb-1">Unverified Project</h4>
        <p className="text-sm opacity-90 leading-relaxed">
          This project has not completed the community verification process.
          Please exercise due diligence when interacting with external
          resources.
        </p>
      </div>
    </div>
  );
}
