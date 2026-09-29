"use client";

import React from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectClaimRequest } from "@/types/project";

interface ClaimStatusBannerProps {
  /** The most recent claim request made by the current wallet for this project. */
  claim: ProjectClaimRequest;
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    iconClass: "text-yellow-500",
    containerClass:
      "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50",
    titleClass: "text-yellow-800 dark:text-yellow-200",
    bodyClass: "text-yellow-700 dark:text-yellow-300",
    title: "Ownership claim pending",
    body: "Your claim has been submitted and is awaiting admin review. You'll be notified here once a decision is made.",
  },
  approved: {
    icon: CheckCircle,
    iconClass: "text-green-500",
    containerClass:
      "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50",
    titleClass: "text-green-800 dark:text-green-200",
    bodyClass: "text-green-700 dark:text-green-300",
    title: "Ownership claim approved",
    body: "Your claim was approved and ownership has been transferred to your wallet.",
  },
  rejected: {
    icon: XCircle,
    iconClass: "text-red-500",
    containerClass:
      "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50",
    titleClass: "text-red-800 dark:text-red-200",
    bodyClass: "text-red-700 dark:text-red-300",
    title: "Ownership claim not approved",
    body: "Your claim was reviewed and not approved.",
  },
} as const;

/**
 * Renders an inline banner on the project detail page informing the connected
 * wallet holder about the status of their most recent ownership claim.
 *
 * Only shown to the wallet that submitted the claim — the parent component is
 * responsible for gating visibility.
 */
export function ClaimStatusBanner({ claim, className }: ClaimStatusBannerProps) {
  const config = STATUS_CONFIG[claim.status];
  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex gap-3 p-4 rounded-2xl border",
        config.containerClass,
        className
      )}
    >
      <Icon
        className={cn("w-5 h-5 mt-0.5 shrink-0", config.iconClass)}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", config.titleClass)}>
          {config.title}
        </p>
        <p className={cn("text-xs mt-0.5 leading-relaxed", config.bodyClass)}>
          {config.body}
        </p>
        {/* Show rejection reason if admin left a note */}
        {claim.status === "rejected" && claim.reviewNote && (
          <p className={cn("text-xs mt-1 italic", config.bodyClass)}>
            Reason: {claim.reviewNote}
          </p>
        )}
        {/* Show approval note if admin left one */}
        {claim.status === "approved" && claim.reviewNote && (
          <p className={cn("text-xs mt-1 italic", config.bodyClass)}>
            Note: {claim.reviewNote}
          </p>
        )}
      </div>
    </div>
  );
}
