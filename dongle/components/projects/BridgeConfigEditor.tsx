"use client";

import React, { useCallback } from "react";
import { Plus, Trash2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  BRIDGE_CHAINS,
  BRIDGE_CHAIN_LABELS,
  type BridgeChain,
  type BridgeChainConfig,
  type BridgeConfig,
  type BridgeLiquidity,
  createEmptyBridgeConfig,
  validateBridgeConfig,
} from "@/types/bridge";

interface BridgeConfigEditorProps {
  value?: BridgeConfig;
  onChange: (config: BridgeConfig) => void;
  /** Disable all controls (e.g. read-only project). */
  disabled?: boolean;
}

const LIQUIDITY_OPTIONS: BridgeLiquidity[] = ["high", "medium", "low", "unknown"];

/**
 * Optional bridge configuration editor for ProjectForm (Issue #726).
 * Supports Ethereum, Polygon, BSC and Solana, with per-chain addresses,
 * bridge UI links, audit status, liquidity, and an experimental flag.
 */
export default function BridgeConfigEditor({
  value,
  onChange,
  disabled = false,
}: BridgeConfigEditorProps) {
  const config = value ?? createEmptyBridgeConfig();
  const errors = validateBridgeConfig(config);

  const update = useCallback(
    (patch: Partial<BridgeConfig>) => onChange({ ...config, ...patch }),
    [config, onChange],
  );

  const addChain = useCallback(() => {
    const used = new Set(config.chains.map((c) => c.chain));
    const nextChain = BRIDGE_CHAINS.find((c) => !used.has(c)) ?? "ethereum";
    const entry: BridgeChainConfig = {
      chain: nextChain,
      bridgeAddress: "",
      audited: false,
      liquidity: "unknown",
      experimental: false,
    };
    update({ enabled: true, chains: [...config.chains, entry] });
  }, [config, update]);

  const updateChain = useCallback(
    (index: number, patch: Partial<BridgeChainConfig>) => {
      const chains = config.chains.map((c, i) => (i === index ? { ...c, ...patch } : c));
      update({ chains });
    },
    [config, update],
  );

  const removeChain = useCallback(
    (index: number) => {
      update({ chains: config.chains.filter((_, i) => i !== index) });
    },
    [config, update],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="w-5 h-5 text-indigo-500" aria-hidden="true" />
        <h3 className="font-bold">Bridge configuration</h3>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.enabled}
          disabled={disabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Enable bridge configuration"
        />
        This project operates on multiple chains and exposes a bridge
      </label>

      {config.enabled && (
        <div className="space-y-4">
          {config.chains.map((entry, index) => (
            <div
              key={index}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <select
                  value={entry.chain}
                  disabled={disabled}
                  onChange={(e) =>
                    updateChain(index, { chain: e.target.value as BridgeChain })
                  }
                  aria-label="Chain"
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm"
                >
                  {BRIDGE_CHAINS.map((chain) => (
                    <option key={chain} value={chain}>
                      {BRIDGE_CHAIN_LABELS[chain]}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => removeChain(index)}
                  className="text-red-500 hover:text-red-700"
                  aria-label={`Remove ${BRIDGE_CHAIN_LABELS[entry.chain]} bridge`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Input
                placeholder={
                  entry.chain === "solana" ? "Solana program ID" : "0x… bridge address"
                }
                value={entry.bridgeAddress}
                disabled={disabled}
                onChange={(e) => updateChain(index, { bridgeAddress: e.target.value })}
                aria-label="Bridge address"
              />

              <Input
                placeholder="https://bridge.example.com (optional)"
                value={entry.bridgeUrl ?? ""}
                disabled={disabled}
                onChange={(e) => updateChain(index, { bridgeUrl: e.target.value })}
                aria-label="Bridge URL"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={entry.liquidity}
                  disabled={disabled}
                  onChange={(e) =>
                    updateChain(index, { liquidity: e.target.value as BridgeLiquidity })
                  }
                  aria-label="Liquidity"
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm"
                >
                  {LIQUIDITY_OPTIONS.map((liq) => (
                    <option key={liq} value={liq}>
                      {liq}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={entry.audited}
                    disabled={disabled}
                    onChange={(e) => updateChain(index, { audited: e.target.checked })}
                    aria-label="Audited"
                  />
                  Audited
                </label>
              </div>

              {entry.audited && (
                <Input
                  placeholder="https://audit.example.com/report (optional)"
                  value={entry.auditReportUrl ?? ""}
                  disabled={disabled}
                  onChange={(e) => updateChain(index, { auditReportUrl: e.target.value })}
                  aria-label="Audit report URL"
                />
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={entry.experimental ?? false}
                  disabled={disabled}
                  onChange={(e) => updateChain(index, { experimental: e.target.checked })}
                  aria-label="Experimental bridge"
                />
                Mark as experimental (shows a warning)
              </label>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || config.chains.length >= BRIDGE_CHAINS.length}
            onClick={addChain}
          >
            <Plus className="w-4 h-4" /> Add chain
          </Button>

          {errors.length > 0 && (
            <ul className="text-xs text-red-500 space-y-1" role="alert">
              {errors.map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
