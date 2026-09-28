"use client";

import React, { useState, useEffect } from "react";
import {
  loadExperiments,
  computeExperimentResults,
  declareWinner,
  type FormExperiment,
  type ExperimentResults,
} from "@/services/form-experiments";
import {
  FlaskConical,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Percent,
  Clock,
  AlertCircle,
  Users,
  Sparkles,
  ArrowUpRight,
  Flame,
} from "lucide-react";
import { toast } from "sonner";

export default function ExperimentAnalyticsView() {
  const [experiments, setExperiments] = useState<FormExperiment[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>("");
  const [results, setResults] = useState<ExperimentResults | null>(null);

  const loadData = () => {
    const all = loadExperiments();
    setExperiments(all);
    if (all.length > 0) {
      const activeId = selectedExperimentId || all[0].id;
      setSelectedExperimentId(activeId);
      setResults(computeExperimentResults(activeId));
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedExperimentId]);

  const handleSelectWinner = (variantId: string, variantName: string) => {
    if (
      window.confirm(
        `Declare "${variantName}" as the winning variant and roll it out to 100% of all future users?`,
      )
    ) {
      const updated = declareWinner(selectedExperimentId, variantId, true);
      if (updated) {
        toast.success(`Winner declared! "${variantName}" is now rolled out to 100% of users.`, {
          description: "Experiment status updated to completed.",
        });
        loadData();
      }
    }
  };

  if (!results) {
    return (
      <div className="p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <FlaskConical className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
        <p className="text-xs text-zinc-500">No active experiments found.</p>
      </div>
    );
  }

  const { experiment, variantStats, isConclusive, totalParticipants } = results;

  return (
    <div className="space-y-6">
      {/* Experiment header & selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                experiment.status === "running"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 animate-pulse"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              }`}
            >
              {experiment.status}
            </span>
            <span className="text-xs text-zinc-400 font-mono">{experiment.id}</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {experiment.name}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Testing form conversions across {experiment.variants.length} variations with deterministic user split.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
              Total Tested Users
            </span>
            <span className="text-xl font-bold">{totalParticipants}</span>
          </div>
        </div>
      </div>

      {/* Statistical Significance Banner */}
      {isConclusive && !experiment.winnerVariantId && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-300">
                Statistical Significance Achieved (p &lt; 0.05)
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-400">
                A variation has outperformed control with 95%+ confidence. You can safely roll out the winner.
              </p>
            </div>
          </div>
        </div>
      )}

      {experiment.winnerVariantId && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <div className="text-xs text-purple-950 dark:text-purple-300">
            <span className="font-bold">Winning Variation Selected: </span>
            <span>
              {experiment.variants.find((v) => v.id === experiment.winnerVariantId)?.name} is currently serving 100% of user traffic.
            </span>
          </div>
        </div>
      )}

      {/* Variant Cards Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(variantStats).map((stat) => {
          const isWinner = experiment.winnerVariantId === stat.variantId;
          const convRatePercent = Math.round(stat.conversionRate * 1000) / 10;

          return (
            <div
              key={stat.variantId}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                isWinner
                  ? "border-purple-500 dark:border-purple-400 bg-purple-50/10 dark:bg-purple-950/20 ring-2 ring-purple-500/20 shadow-lg"
                  : stat.isControl
                    ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    : "border-blue-200 dark:border-blue-900/40 bg-white dark:bg-zinc-900"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        stat.isControl
                          ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {stat.isControl ? "Control (Baseline)" : "Variant Variation"}
                    </span>
                    {isWinner && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                        <Trophy className="w-3 h-3" /> Winner
                      </span>
                    )}
                  </div>

                  {!stat.isControl && stat.liftVsControlPercent !== 0 && (
                    <span
                      className={`text-xs font-bold flex items-center gap-0.5 ${
                        stat.liftVsControlPercent > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {stat.liftVsControlPercent > 0 ? "+" : ""}
                      {stat.liftVsControlPercent}% Conversion Lift
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-1">
                  {stat.variantName}
                </h3>
                <p className="text-xs text-zinc-500 mb-6">
                  {experiment.variants.find((v) => v.id === stat.variantId)?.description}
                </p>

                {/* Conversion Big Metric */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 mb-6">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                        Submission Conversion Rate
                      </span>
                      <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                        {convRatePercent}%
                      </span>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {stat.metrics.submissions}
                      </span>{" "}
                      of {stat.metrics.impressions} visitors
                    </div>
                  </div>

                  {/* 95% Confidence Interval */}
                  <div className="mt-3 pt-3 border-t border-zinc-200/50 dark:border-zinc-700/50 text-[11px] flex items-center justify-between text-zinc-500">
                    <span>95% Confidence Interval:</span>
                    <span className="font-mono font-medium">
                      {(stat.conversionRateCI95[0] * 100).toFixed(1)}% –{" "}
                      {(stat.conversionRateCI95[1] * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-3 text-xs mb-6">
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Form Starts</span>
                    <span className="font-bold text-sm">{stat.metrics.starts}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Avg. Duration</span>
                    <span className="font-bold text-sm">
                      {stat.avgTimeToCompleteSeconds > 0
                        ? `${stat.avgTimeToCompleteSeconds}s`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Form Errors</span>
                    <span className="font-bold text-sm">{stat.metrics.errors}</span>
                  </div>
                </div>

                {/* Statistical Significance indicator (for non-control) */}
                {!stat.isControl && (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Two-proportion Z-score:</span>
                      <span className="font-mono font-bold">{stat.zScore}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Two-tailed p-value:</span>
                      <span className="font-mono font-bold">{stat.pValue}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-zinc-500">Statistical Significance:</span>
                      <span
                        className={`font-bold ${
                          stat.isStatisticallySignificant
                            ? "text-green-600 dark:text-green-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {stat.isStatisticallySignificant
                          ? `Yes (${stat.confidenceLevel}% Confidence)`
                          : "Not Yet Significant"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Winner Selection Action */}
              {!isWinner && (
                <button
                  type="button"
                  onClick={() => handleSelectWinner(stat.variantId, stat.variantName)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    stat.isStatisticallySignificant
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                      : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Declare Winner & Roll Out (100%)
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
