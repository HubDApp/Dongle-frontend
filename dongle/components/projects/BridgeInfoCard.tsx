"use client";

import React from "react";
import { ArrowLeftRight, ExternalLink, ShieldCheck, ShieldAlert, Droplets, FlaskConical } from "lucide-react";
import {
  BRIDGE_CHAIN_LABELS,
  BRIDGE_LIQUIDITY_LABELS,
  type BridgeConfig,
  type BridgeLiquidity,
} from "@/types/bridge";

interface BridgeInfoCardProps {
  bridge?: BridgeConfig;
  className?: string;
}

const LIQUIDITY_CLASS: Record<BridgeLiquidity, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  unknown: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

/**
 * Displays cross-chain bridge information for a multi-chain project
 * (Issue #726). Renders nothing when the project has no bridge config.
 */
export default function BridgeInfoCard({ bridge, className = "" }: BridgeInfoCardProps) {
  if (!bridge || !bridge.enabled || bridge.chains.length === 0) return null;

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight className="w-5 h-5 text-indigo-500" aria-hidden="true" />
        <h3 className="text-lg font-bold">Bridges</h3>
        <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
          ({bridge.chains.length})
        </span>
      </div>

      <div className="space-y-4">
        {bridge.chains.map((entry) => (
          <div
            key={entry.chain}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{BRIDGE_CHAIN_LABELS[entry.chain]}</span>
              <div className="flex items-center gap-2">
                {/* Audited Y/N */}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                    entry.audited
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                  title={entry.audited ? "Bridge contracts are audited" : "Bridge is NOT audited"}
                >
                  {entry.audited ? (
                    <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                  )}
                  {entry.audited ? "Audited" : "Not audited"}
                </span>

                {/* Liquidity indicator */}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded-full ${LIQUIDITY_CLASS[entry.liquidity]}`}
                >
                  <Droplets className="w-3 h-3" aria-hidden="true" />
                  {BRIDGE_LIQUIDITY_LABELS[entry.liquidity]}
                </span>
              </div>
            </div>

            {/* Experimental warning */}
            {entry.experimental && (
              <div className="flex gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-700 dark:text-amber-400">
                <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <p>This bridge is experimental. Use at your own risk.</p>
              </div>
            )}

            {/* Bridge address */}
            <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400 break-all">
              {entry.bridgeAddress}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 text-xs">
              {entry.bridgeUrl && (
                <a
                  href={entry.bridgeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Open bridge
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
              {entry.audited && entry.auditReportUrl && (
                <a
                  href={entry.auditReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:underline"
                >
                  Audit report
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
