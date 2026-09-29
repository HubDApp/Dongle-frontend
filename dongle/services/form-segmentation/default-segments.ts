/**
 * Default Built-in Segments for Form Submissions
 */

import type { SubmissionSegment } from "./types";

export const DEFAULT_SEGMENTS: SubmissionSegment[] = [
  {
    id: "seg_defi_powerhouses",
    name: "DeFi Powerhouses",
    description: "High-quality decentralized finance protocols and DEXs with quality score >= 75",
    color: "#3b82f6", // Blue
    badgeBg: "bg-blue-100 dark:bg-blue-900/30",
    badgeText: "text-blue-700 dark:text-blue-400",
    icon: "Coins",
    priority: 1,
    isActive: true,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ruleGroup: {
      logic: "AND",
      rules: [
        { field: "primaryCategory", operator: "equals", value: "DeFi / DEX" },
        { field: "qualityScore", operator: "greaterThanOrEqual", value: 75 },
      ],
    },
  },
  {
    id: "seg_smart_contract_enabled",
    name: "Smart Contract Enabled",
    description: "Submissions with active Soroban smart contract addresses attached",
    color: "#8b5cf6", // Purple
    badgeBg: "bg-purple-100 dark:bg-purple-900/30",
    badgeText: "text-purple-700 dark:text-purple-400",
    icon: "Code2",
    priority: 2,
    isActive: true,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ruleGroup: {
      logic: "AND",
      rules: [
        { field: "hasContracts", operator: "equals", value: true },
      ],
    },
  },
  {
    id: "seg_high_trust",
    name: "High-Trust Top Tier",
    description: "Exceptional submissions with 85%+ quality score, audit report, and zero suspicious flags",
    color: "#10b981", // Emerald
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/30",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    icon: "ShieldCheck",
    priority: 3,
    isActive: true,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ruleGroup: {
      logic: "AND",
      rules: [
        { field: "qualityScore", operator: "greaterThanOrEqual", value: 85 },
        { field: "flagCount", operator: "equals", value: 0 },
      ],
    },
  },
  {
    id: "seg_needs_moderation",
    name: "Needs Moderation / Risk",
    description: "Submissions flagged by anomaly detection, with quality score < 50, or status flagged",
    color: "#f97316", // Orange
    badgeBg: "bg-orange-100 dark:bg-orange-900/30",
    badgeText: "text-orange-700 dark:text-orange-400",
    icon: "AlertTriangle",
    priority: 4,
    isActive: true,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ruleGroup: {
      logic: "OR",
      rules: [
        { field: "status", operator: "equals", value: "flagged" },
        { field: "qualityScore", operator: "lessThan", value: 50 },
        { field: "flagCount", operator: "greaterThan", value: 0 },
      ],
    },
  },
  {
    id: "seg_infrastructure",
    name: "Infrastructure & Tools",
    description: "Developer tooling, RPC services, indexers, and ecosystem infrastructure",
    color: "#06b6d4", // Cyan
    badgeBg: "bg-cyan-100 dark:bg-cyan-900/30",
    badgeText: "text-cyan-700 dark:text-cyan-400",
    icon: "Layers",
    priority: 5,
    isActive: true,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ruleGroup: {
      logic: "AND",
      rules: [
        { field: "primaryCategory", operator: "equals", value: "Infrastructure" },
      ],
    },
  },
  {
    id: "seg_gaming_nft",
    name: "Gaming & Metaverse",
    description: "Gaming projects, NFT collections, and interactive entertainment on Stellar",
    color: "#ec4899", // Pink
    badgeBg: "bg-pink-100 dark:bg-pink-900/30",
    badgeText: "text-pink-700 dark:text-pink-400",
    icon: "Gamepad2",
    priority: 6,
    isActive: true,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ruleGroup: {
      logic: "AND",
      rules: [
        { field: "primaryCategory", operator: "equals", value: "Gaming / NFT" },
      ],
    },
  },
];
