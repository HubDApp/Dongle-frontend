import React from "react";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, Clock, ShieldX, ShieldAlert } from "lucide-react";

export type VerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

interface VerificationBadgeProps {
  status: VerificationStatus;
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
  showIcon = true, 
  className 
}: VerificationBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
};
