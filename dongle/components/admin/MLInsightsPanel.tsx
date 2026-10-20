"use client";

/**
 * ML predictions panel (Issue #711) — rendered on the admin dashboard.
 *
 * Shows the trending forecast, churn risk scores and verification approval
 * likelihood with confidence scores, plus feature importance and the weekly
 * retraining schedule.
 */

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BarChart } from "@/components/analytics";
import {
  MODEL_SPECS,
  featureImportance,
  runModelInference,
} from "@/lib/analytics-dashboard/ml-models";

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function confidenceVariant(value: number) {
  if (value >= 0.8) return "success" as const;
  if (value >= 0.6) return "warning" as const;
  return "secondary" as const;
}

export default function MLInsightsPanel({ limit = 8 }: { limit?: number }) {
  const { trending, churn, verification, metadata } = useMemo(() => runModelInference(), []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-1">Project trending (7-day forecast)</h3>
          <p className="text-xs text-zinc-500 mb-4">Predicted to trend over the next week</p>
          <ul className="space-y-3">
            {trending.slice(0, limit).map((prediction) => (
              <li key={prediction.targetId} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{prediction.targetLabel}</p>
                  <p className="text-xs text-zinc-500">
                    forecast {prediction.forecast ?? "—"} reviews/7d
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{pct(prediction.score)}</span>
                  <Badge variant={confidenceVariant(prediction.confidence)}>
                    conf {pct(prediction.confidence)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-1">User churn risk</h3>
          <p className="text-xs text-zinc-500 mb-4">Higher score = more likely to churn</p>
          <ul className="space-y-3">
            {churn.slice(0, limit).map((prediction) => (
              <li key={prediction.targetId} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{prediction.targetLabel}</p>
                  <p className="text-xs text-zinc-500">
                    top driver: {prediction.drivers[0]?.label ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{pct(prediction.score)}</span>
                  <Badge
                    variant={
                      prediction.score > 0.6 ? "error" : prediction.score > 0.35 ? "warning" : "success"
                    }
                  >
                    {prediction.score > 0.6 ? "high" : prediction.score > 0.35 ? "medium" : "low"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-1">Verification approval likelihood</h3>
          <p className="text-xs text-zinc-500 mb-4">Expected approval chance per project</p>
          <ul className="space-y-3">
            {verification.slice(0, limit).map((prediction) => (
              <li key={prediction.targetId} className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{prediction.targetLabel}</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{pct(prediction.score)}</span>
                  <Badge variant={confidenceVariant(prediction.confidence)}>
                    conf {pct(prediction.confidence)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Feature importance</h3>
          <div className="space-y-5">
            {(Object.keys(MODEL_SPECS) as Array<keyof typeof MODEL_SPECS>).map((modelKey) => (
              <div key={modelKey}>
                <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">
                  {MODEL_SPECS[modelKey].name}
                </p>
                <BarChart
                  data={featureImportance(modelKey).map((feature) => ({
                    label: feature.feature,
                    value: Math.abs(feature.weight),
                  }))}
                  horizontal
                  height={150}
                  formatValue={(v) => v.toFixed(1)}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Model training</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metadata.map((model) => (
              <div
                key={model.key}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <p className="text-sm font-medium">{model.name}</p>
                <p className="text-xs text-zinc-500 mb-2">v{model.version}</p>
                <dl className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <dt>Trained</dt>
                    <dd className="font-mono">{new Date(model.trainedAt).toLocaleDateString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Retrain</dt>
                    <dd className="font-mono">{new Date(model.retrainAt).toLocaleDateString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Samples</dt>
                    <dd className="font-mono">{model.sampleSize}</dd>
                  </div>
                </dl>
                <ul className="mt-2 text-xs space-y-1">
                  {model.metrics.map((metric) => (
                    <li key={metric.label} className="flex justify-between">
                      <span className="text-zinc-500">{metric.label}</span>
                      <span className="font-mono">{metric.value}</span>
                    </li>
                  ))}
                </ul>
                <Badge variant="outline" className="mt-2">
                  {model.retrainInterval} retrain
                </Badge>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Top driver per prediction is shown in the cards above; full feature contributions are
            computed by the weighted-logistic models in{" "}
            <code>lib/analytics-dashboard/ml-models.ts</code>.
          </p>
        </Card>
      </div>
    </div>
  );
}
