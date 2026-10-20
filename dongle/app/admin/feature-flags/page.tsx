"use client";

/**
 * Feature flags & A/B test admin UI (Issue #714).
 *
 * Configure flags, inspect per-variant conversion metrics, check statistical
 * significance, and roll the winning variant out to 100% of users.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import WalletGate from "@/components/wallet/WalletGate";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  createFlag,
  deleteFlag,
  getExperimentResult,
  getMetrics,
  listFlags,
  recordConversion,
  recordExposure,
  resetMetrics,
  selectWinner,
  upsertFlag,
} from "@/lib/feature-flags";
import type { ExperimentResult, FeatureFlag } from "@/lib/feature-flags";
import { AlertCircle, FlaskConical, Play, Plus, RefreshCw, Trash2, Trophy } from "lucide-react";

const ADMIN_PURPOSE =
  "Connect an authorized admin Freighter wallet to manage feature flags.";

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function FeatureFlagsPage() {
  const { isAdmin, gate } = useAdminAccess();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");

  const refresh = useCallback(() => {
    const next = listFlags();
    setFlags(next);
    setSelected((current) => current ?? next[0]?.key ?? null);
  }, []);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  const activeFlag = useMemo(
    () => flags.find((flag) => flag.key === selected) ?? null,
    [flags, selected],
  );

  useEffect(() => {
    if (activeFlag) setResult(getExperimentResult(activeFlag.key));
  }, [activeFlag, flags]);

  const handleCreate = () => {
    const key = newKey.trim();
    if (!key) return;
    createFlag(key, newName.trim() || key);
    setNewKey("");
    setNewName("");
    refresh();
    setSelected(key);
  };

  const handleToggle = (flag: FeatureFlag) => {
    upsertFlag({ ...flag, enabled: !flag.enabled });
    refresh();
  };

  const handleSimulate = (flag: FeatureFlag) => {
    // Generate a small amount of synthetic traffic so the significance
    // calculator and automatic winner selection can be evaluated.
    for (let i = 0; i < 200; i += 1) {
      const variant = flag.variants[i % flag.variants.length];
      recordExposure(flag.key, variant.key);
      const isVariant = variant.key !== flag.variants[0]?.key;
      const conversionProbability = isVariant ? 0.22 : 0.12;
      if (Math.random() < conversionProbability) {
        recordConversion(flag.key, variant.key);
      }
    }
    setResult(getExperimentResult(flag.key));
  };

  const handleSelectWinner = (flag: FeatureFlag) => {
    const updated = selectWinner(flag.key);
    if (!updated) return;
    refresh();
    setResult(getExperimentResult(flag.key));
  };

  const handleReset = (flag: FeatureFlag) => {
    resetMetrics(flag.key);
    setResult(getExperimentResult(flag.key));
  };

  const handleDelete = (flag: FeatureFlag) => {
    deleteFlag(flag.key);
    setSelected(null);
    refresh();
  };

  if (gate.state !== "ready") {
    return (
      <div className="container mx-auto px-4 py-32 min-h-screen max-w-2xl">
        <WalletGate
          gate={gate}
          pagePurpose={ADMIN_PURPOSE}
          loadingMessage="Verifying wallet access..."
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center min-h-screen">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Connect an authorized admin wallet to manage feature flags.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-8 flex items-center gap-3">
        <FlaskConical className="w-8 h-8 text-purple-500" />
        <div>
          <h1 className="text-3xl font-bold">Feature Flags &amp; A/B Tests</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Configure toggles, bucket traffic 50/50, and roll out winners.
          </p>
        </div>
      </header>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Create flag</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            aria-label="Flag key"
            placeholder="flag_key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
          />
          <input
            aria-label="Flag name"
            placeholder="Human readable name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
          />
          <Button onClick={handleCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Create 50/50 flag
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Flags</h2>
          <ul className="space-y-2">
            {flags.map((flag) => (
              <li key={flag.key}>
                <button
                  onClick={() => setSelected(flag.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg border ${
                    selected === flag.key
                      ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <span className="font-medium">{flag.name}</span>
                  <span className="block text-xs text-zinc-500">{flag.key}</span>
                </button>
              </li>
            ))}
            {flags.length === 0 && (
              <li className="text-sm text-zinc-500">No flags yet.</li>
            )}
          </ul>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {activeFlag && (
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{activeFlag.name}</h2>
                  <p className="text-xs text-zinc-500 font-mono">{activeFlag.key}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={activeFlag.enabled ? "success" : "secondary"}>
                    {activeFlag.enabled ? "enabled" : "disabled"}
                  </Badge>
                  <Badge variant={activeFlag.status === "completed" ? "primary" : "outline"}>
                    {activeFlag.status}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Button size="sm" variant="outline" onClick={() => handleToggle(activeFlag)}>
                  {activeFlag.enabled ? "Disable" : "Enable"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSimulate(activeFlag)}
                  leftIcon={<Play className="w-4 h-4" />}
                >
                  Simulate traffic
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReset(activeFlag)}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  Reset metrics
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSelectWinner(activeFlag)}
                  leftIcon={<Trophy className="w-4 h-4" />}
                  disabled={!result?.winnerKey}
                >
                  Roll out winner
                </Button>
                <Button
                  size="sm"
                  variant="error"
                  onClick={() => handleDelete(activeFlag)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Delete
                </Button>
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2">Variant</th>
                    <th className="py-2 text-right">Exposures</th>
                    <th className="py-2 text-right">Conversions</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Lift</th>
                    <th className="py-2 text-right">p-value</th>
                  </tr>
                </thead>
                <tbody>
                  {(result?.variants ?? []).map((variant) => (
                    <tr key={variant.variantKey} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="py-2">
                        <span className="inline-flex items-center gap-2">
                          {variant.name}
                          {variant.isWinner && (
                            <Badge variant="success" aria-label="winner">
                              winner
                            </Badge>
                          )}
                          {variant.variantKey === result?.controlKey && (
                            <Badge variant="outline">control</Badge>
                          )}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono">{variant.exposures}</td>
                      <td className="py-2 text-right font-mono">{variant.conversions}</td>
                      <td className="py-2 text-right font-mono">{formatRate(variant.conversionRate)}</td>
                      <td className="py-2 text-right font-mono">
                        {(variant.lift * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-right font-mono">{variant.pValue.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-3 text-xs text-zinc-500">
                {result?.winnerKey
                  ? `Winner: ${result.winnerKey} · confidence ${result.confidence.toFixed(1)}%`
                  : "No statistically significant winner yet — collect more data."}
              </p>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Bucketing</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Users are assigned deterministically from a hash of <code>flagKey:userId</code>,
              so the same user always sees the same variant. Variant weights default to a
              50/50 split and can be adjusted per flag.
            </p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {flags
                .flatMap((flag) =>
                  flag.variants.map((variant) => ({
                    flag: flag.key,
                    variant: variant.key,
                    metrics: getMetrics(flag.key).find((m) => m.variantKey === variant.key),
                  })),
                )
                .slice(0, 6)
                .map((row) => (
                  <div
                    key={`${row.flag}-${row.variant}`}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
                  >
                    <p className="font-mono text-xs text-zinc-500">{row.flag}</p>
                    <p className="font-medium">{row.variant}</p>
                    <p className="text-xs text-zinc-500">
                      {row.metrics?.exposures ?? 0} exposures ·{" "}
                      {row.metrics?.conversions ?? 0} conversions
                    </p>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
