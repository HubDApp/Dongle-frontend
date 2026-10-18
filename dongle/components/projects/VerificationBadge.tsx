import React from "react";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, Clock, ShieldX, ShieldAlert } from "lucide-react";
import type { VerificationTier } from "@/types/project";

export type VerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

interface VerificationBadgeProps {
  status: VerificationStatus;
  tier?: VerificationTier;
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  NONE: {
    label: "Unverified",
    variant: "secondary" as const,
    icon: ShieldAlert,
  },
  PENDING: {
    label: "Pending",
    variant: "warning" as const,
    icon: Clock,
  },
  VERIFIED: {
    label: "Verified",
    variant: "success" as const,
    icon: ShieldCheck,
  },
  REJECTED: {
    label: "Rejected",
    variant: "error" as const,
    icon: ShieldX,
  },
};

export const VerificationBadge = ({ 
  status, 
  tier,
  showIcon = true, 
  className 
}: VerificationBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const tierStyles: Record<VerificationTier, string> = {
    BRONZE: "border-amber-700/30 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    SILVER: "border-slate-400/40 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    GOLD: "border-yellow-500/40 bg-yellow-100 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-200",
  };
  const label = status === "VERIFIED" && tier ? `${tier[0]}${tier.slice(1).toLowerCase()} Verified` : config.label;

  return (
    <Badge
      variant={config.variant}
      className={`${className ?? ""} ${status === "VERIFIED" && tier ? tierStyles[tier] : ""}`}
      aria-label={`Verification status: ${label}`}
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" aria-hidden="true" />}
      {label}
    </Badge>
  );
};
