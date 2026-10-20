"use client";

import { format } from "date-fns";
import {
  useDexTrading,
  buildTradeLink,
  type DexTradingData,
} from "@/hooks/useDexTrading";
import { ArrowRight, Clock, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface DexTradingCardProps {
  tokenCode: string;
  tokenIssuer: string;
}

/**
 * Displays Stellar DEX trading metrics for a project's token.
 *
 * Implements issue #725 acceptance criteria: current price, 24h volume,
 * 7-day price chart, liquidity, and a link to trade on the DEX, with a
 * graceful fallback when the token is not listed.
 */
export function DexTradingCard({ tokenCode, tokenIssuer }: DexTradingCardProps) {
  const { data, loading, error, refetch } = useDexTrading(tokenCode, tokenIssuer);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 border rounded-lg">
        <div className="h-4 w-4 rounded-full animate-pulse bg-muted" />
        <span className="text-sm text-muted-foreground">Loading trading data…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Unable to load trading data.</p>
      </div>
    );
  }

  const priceColor =
    Number(data.priceChange24h || "0") >= 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  const priceIcon = Number(data.priceChange24h || "0") >= 0 ? TrendingUp : TrendingDown;

  return (
    <section className="border rounded-xl p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Stellar DEX Trading Data
          </h2>
          <p className="text-xs text-muted-foreground mb-2">
            Token: {data.token?.code} ({data.token?.issuer})
          </p>
          {!data.hasToken && (
            <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              {data.error || "Token not found on Stellar DEX"}
            </div>
          )}
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={refetch}
            disabled={loading}
            className="ml-auto text-xs border rounded px-2 py-1 hover:bg-accent transition"
          >
            <Clock className="h-3 w-3 mr-1" /> Refresh
          </button>
        </div>
      </div>

      {!data.hasToken ? (
        <div className="bg-muted rounded-lg p-4 text-center text-sm text-muted-foreground">
          No trading activity detected for this token on the Stellar DEX.{" "}
          {data.tradeLink ? (
            <a
              href={data.tradeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Add liquidity / trade on DEX
            </a>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Current Price" value={data.currentPrice || "—"} unit="XLM" />
          <MetricCard
            title="24h Change"
            value={data.priceChange24h ? `${data.priceChange24h}%` : "—"}
            unit=""
            className={priceColor}
            icon={priceIcon}
          />
          <MetricCard title="24h Volume" value={data.volume24h || "—"} unit="XLM" />
          <MetricCard title="Liquidity" value={data.liquidity || "—"} unit="XLM" />
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">7-Day Price Chart</h3>
          </div>
          <div className="h-32 bg-muted rounded-lg p-3 text-xs text-muted-foreground flex items-center justify-center">
            {data.chart7d.length > 0 ? (
              <p>Chart rendering {data.chart7d.length} samples (latest:{" "}
                {format(new Date(data.chart7d[data.chart7d.length - 1].timestamp), "MMM d")}</p>
            ) : (
              <p>No chart data available.</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Trade on DEX</h3>
          </div>
          <a
            href={data.tradeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Open in StellarTerm
          </a>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Source: {data.source === "horizon" ? "Stellar Horizon /trades" : "Fallback (cached)"}{" "}
          • Updated {data.updatedAt} • Data cached for 5 minutes
        </div>
      )}
    </section>
  );
}

function MetricCard({
  title,
  value,
  unit,
  className,
  icon: Icon,
}: {
  title: string;
  value: string;
  unit: string;
  className?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="bg-card rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {Icon ? <Icon className="h-3 w-3 text-muted-foreground" /> : null}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-semibold ${className || ""}`}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
