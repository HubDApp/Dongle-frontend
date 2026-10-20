"use client";

/**
 * Time-based verification expiration (#688).
 *
 * Displays verification expiry date, marks expired verifications,
 * and provides re-verification option with grace period.
 */

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Clock, AlertTriangle, RefreshCw, Calendar } from "lucide-react";

export type VerificationTier = "bronze" | "gold";

export interface ExpiryConfig {
  months: number;
  gracePeriodDays: number;
  reminderDaysBefore: number;
}

export const EXPIRY_CONFIGS: Record<VerificationTier, ExpiryConfig> = {
  bronze: { months: 12, gracePeriodDays: 15, reminderDaysBefore: 30 },
  gold: { months: 24, gracePeriodDays: 15, reminderDaysBefore: 30 },
};

export type VerificationExpiryStatus = "active" | "expiring_soon" | "expired" | "grace_period";

interface VerificationExpiryProps {
  approvedAt: string;
  tier: VerificationTier;
  onReverify?: () => void;
  onExtend?: () => void;
  isAdmin?: boolean;
}

function getExpiryDate(approvedAt: string, tier: VerificationTier): Date {
  const approved = new Date(approvedAt);
  const config = EXPIRY_CONFIGS[tier];
  const expiry = new Date(approved);
  expiry.setMonth(expiry.getMonth() + config.months);
  return expiry;
}

function getExpiryStatus(
  approvedAt: string,
  tier: VerificationTier,
): VerificationExpiryStatus {
  const config = EXPIRY_CONFIGS[tier];
  const expiry = getExpiryDate(approvedAt, tier);
  const now = Date.now();
  const graceEnd = expiry.getTime() + config.gracePeriodDays * 86400000;
  const reminderStart = expiry.getTime() - config.reminderDaysBefore * 86400000;

  if (now > graceEnd) return "expired";
  if (now > expiry.getTime()) return "grace_period";
  if (now > reminderStart) return "expiring_soon";
  return "active";
}

function getStatusBadge(status: VerificationExpiryStatus) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "expiring_soon":
      return <Badge variant="warning">Expiring Soon</Badge>;
    case "grace_period":
      return <Badge variant="warning">Grace Period</Badge>;
    case "expired":
      return <Badge variant="error">Expired</Badge>;
  }
}

export function VerificationExpiry({
  approvedAt,
  tier,
  onReverify,
  onExtend,
  isAdmin = false,
}: VerificationExpiryProps) {
  const expiryDate = getExpiryDate(approvedAt, tier);
  const status = getExpiryStatus(approvedAt, tier);
  const config = EXPIRY_CONFIGS[tier];

  const daysRemaining = Math.ceil(
    (expiryDate.getTime() - Date.now()) / 86400000,
  );

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-medium">
              Expires on {expiryDate.toLocaleDateString()}
            </p>
            {getStatusBadge(status)}
          </div>

          {status === "expiring_soon" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
            </p>
          )}

          {status === "grace_period" && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Grace period — {Math.abs(daysRemaining)} day
              {Math.abs(daysRemaining) !== 1 ? "s" : ""} past expiry
            </p>
          )}

          {status === "expired" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              This verification has expired. Re-verification is required.
            </p>
          )}

          <p className="text-xs text-gray-500 mt-1">
            {tier === "gold" ? "Gold" : "Bronze"} tier — {config.months} month
            validity, {config.gracePeriodDays} day grace period
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {(status === "expired" || status === "grace_period") && onReverify && (
            <Button size="sm" onClick={onReverify}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Re-verify
            </Button>
          )}
          {isAdmin && onExtend && (
            <Button size="sm" variant="outline" onClick={onExtend}>
              Extend
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
