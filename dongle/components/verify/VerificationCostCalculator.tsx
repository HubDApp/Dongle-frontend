"use client";

/**
 * Verification cost calculator (#689).
 *
 * Shows estimated verification costs with breakdown before submission.
 * Supports tier multiplier, project category, and rush fee options.
 */

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { Calculator, DollarSign, Zap, Clock } from "lucide-react";

export type VerificationTier = "bronze" | "silver" | "gold";
export type ProjectCategory = "defi" | "nft" | "gaming" | "infrastructure" | "other";
export type Urgency = "standard" | "rush";

interface CostBreakdown {
  baseFee: number;
  tierMultiplier: number;
  categoryMultiplier: number;
  rushFee: number;
  totalUSD: number;
  totalXLM: number;
}

// Base fee in USD
const BASE_FEE_USD = 100;

// Tier multipliers
const TIER_MULTIPLIERS: Record<VerificationTier, number> = {
  bronze: 1.0,
  silver: 1.5,
  gold: 2.5,
};

// Category multipliers
const CATEGORY_MULTIPLIERS: Record<ProjectCategory, number> = {
  defi: 1.2,
  nft: 1.0,
  gaming: 1.0,
  infrastructure: 1.3,
  other: 1.0,
};

// Rush fee percentage
const RUSH_FEE_PERCENT = 50;

// Approximate XLM/USD rate (in production, fetch from oracle)
const XLM_USD_RATE = 0.12;

interface VerificationCostCalculatorProps {
  onProceed?: (cost: CostBreakdown) => void;
  adminOverride?: number;
}

export function VerificationCostCalculator({
  onProceed,
  adminOverride,
}: VerificationCostCalculatorProps) {
  const [tier, setTier] = useState<VerificationTier>("bronze");
  const [category, setCategory] = useState<ProjectCategory>("defi");
  const [urgency, setUrgency] = useState<Urgency>("standard");
  const [quoteLockedAt, setQuoteLockedAt] = useState<number | null>(null);

  const cost = useMemo<CostBreakdown>(() => {
    const tierMult = TIER_MULTIPLIERS[tier];
    const catMult = CATEGORY_MULTIPLIERS[category];
    const rushFee = urgency === "rush" ? BASE_FEE_USD * (RUSH_FEE_PERCENT / 100) : 0;
    const totalUSD = adminOverride ?? BASE_FEE_USD * tierMult * catMult + rushFee;
    const totalXLM = totalUSD / XLM_USD_RATE;

    return {
      baseFee: BASE_FEE_USD,
      tierMultiplier: tierMult,
      categoryMultiplier: catMult,
      rushFee,
      totalUSD,
      totalXLM,
    };
  }, [tier, category, urgency, adminOverride]);

  const isQuoteLocked =
    quoteLockedAt !== null && Date.now() - quoteLockedAt < 24 * 3600 * 1000;

  const handleProceed = () => {
    if (!isQuoteLocked) {
      setQuoteLockedAt(Date.now());
    }
    onProceed?.(cost);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold">Verification Cost Estimate</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <FormField label="Tier">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as VerificationTier)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="bronze">Bronze (1x)</option>
            <option value="silver">Silver (1.5x)</option>
            <option value="gold">Gold (2.5x)</option>
          </select>
        </FormField>

        <FormField label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProjectCategory)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="defi">DeFi (1.2x)</option>
            <option value="nft">NFT (1x)</option>
            <option value="gaming">Gaming (1x)</option>
            <option value="infrastructure">Infrastructure (1.3x)</option>
            <option value="other">Other (1x)</option>
          </select>
        </FormField>

        <FormField label="Urgency">
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as Urgency)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="standard">Standard</option>
            <option value="rush">Rush (+50%)</option>
          </select>
        </FormField>
      </div>

      {/* Cost Breakdown */}
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Cost Breakdown
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Base fee</span>
            <span>${cost.baseFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Tier multiplier ({tier})
            </span>
            <span>×{cost.tierMultiplier}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Category multiplier ({category})
            </span>
            <span>×{cost.categoryMultiplier}</span>
          </div>
          {cost.rushFee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Rush fee</span>
              <span>${cost.rushFee.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-medium">
            <span>Total</span>
            <span>
              ${cost.totalUSD.toFixed(2)} ({cost.totalXLM.toFixed(2)} XLM)
            </span>
          </div>
        </div>
      </div>

      {adminOverride !== undefined && (
        <div className="mb-4">
          <Badge variant="info">Admin Override Applied</Badge>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {isQuoteLocked
            ? "Quote locked for 24 hours"
            : "Quote will be locked for 24 hours after proceeding"}
        </div>
        <Button onClick={handleProceed}>
          <DollarSign className="h-4 w-4 mr-2" />
          Proceed to Payment
        </Button>
      </div>
    </Card>
  );
}
