"use client";

import React from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface UnclaimedProjectBannerProps {
  projectName: string;
  /** Called when the user clicks "Claim this project" */
  onClaim: () => void;
  className?: string;
}

/**
 * A prominent banner shown on the project detail page when the project has no
 * registered owner yet.  Invites the legitimate team to start a claim.
 */
export function UnclaimedProjectBanner({
  projectName,
  onClaim,
  className,
}: UnclaimedProjectBannerProps) {
  return (
    <div
      role="region"
      aria-label="Unclaimed project notice"
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center gap-4",
        "p-5 rounded-2xl border",
        "bg-amber-50 dark:bg-amber-950/20",
        "border-amber-200 dark:border-amber-900/50",
        className,
      )}
    >
      {/* Icon */}
      <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <ShieldCheck
          className="w-5 h-5 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
      </div>

      {/* Copy */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          {projectName} is unclaimed
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
          Are you the team behind this project? Submit ownership proof via
          website, repository, or admin review to take control of this listing.
        </p>
      </div>

      {/* CTA */}
      <Button
        variant="outline"
        size="sm"
        onClick={onClaim}
        className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
      >
        <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
        Claim this project
      </Button>
    </div>
  );
}
