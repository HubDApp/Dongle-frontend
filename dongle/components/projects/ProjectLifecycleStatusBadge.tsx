import React from "react";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircle2,
  PauseCircle,
  MinusCircle,
  Archive,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { ProjectStatus, PROJECT_STATUS_LABELS, getProjectStatus } from "@/types/project";

interface ProjectLifecycleStatusBadgeProps {
  status?: ProjectStatus;
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<
  ProjectStatus,
  { label: string; variant: "primary" | "secondary" | "success" | "warning" | "error"; icon: React.ComponentType<{ className?: string }> }
> = {
  active: { label: PROJECT_STATUS_LABELS.active, variant: "success", icon: CheckCircle2 },
  paused: { label: PROJECT_STATUS_LABELS.paused, variant: "warning", icon: PauseCircle },
  deprecated: { label: PROJECT_STATUS_LABELS.deprecated, variant: "secondary", icon: MinusCircle },
  archived: { label: PROJECT_STATUS_LABELS.archived, variant: "secondary", icon: Archive },
  flagged: { label: PROJECT_STATUS_LABELS.flagged, variant: "error", icon: AlertTriangle },
  removed: { label: PROJECT_STATUS_LABELS.removed, variant: "error", icon: XCircle },
};

/**
 * Renders a project's lifecycle status (active, paused, deprecated, archived,
 * flagged, removed) as a colored pill. Omitted statuses are treated as
 * "active" for display purposes.
 */
export const ProjectLifecycleStatusBadge = ({
  status,
  showIcon = true,
  className,
}: ProjectLifecycleStatusBadgeProps) => {
  const config = statusConfig[getProjectStatus(status)];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
};
