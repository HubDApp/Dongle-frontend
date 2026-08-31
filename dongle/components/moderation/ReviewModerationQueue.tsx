"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { FlaggedReview, SpamStatistics } from "@/types/moderation";
import { reviewModerationService } from "@/services/review/review-moderation.service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { formatDate } from "@/lib/date";

interface ReviewModerationQueueProps {
  moderatorAddress: string;
}

export function ReviewModerationQueue({ moderatorAddress }: ReviewModerationQueueProps) {
  const [queue, setQueue] = useState<FlaggedReview[]>([]);
  const [stats, setStats] = useState<SpamStatistics | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const reload = useCallback(async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading) {
      setLoading(true);
    }

    const [pending, spamStats] = await Promise.all([
      reviewModerationService.getQueue("pending"),
      reviewModerationService.getStats(),
    ]);
    setQueue(pending);
    setStats(spamStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [pending, spamStats] = await Promise.all([
        reviewModerationService.getQueue("pending"),
        reviewModerationService.getStats(),
      ]);

      if (cancelled) return;
      setQueue(pending);
      setStats(spamStats);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulk = async (action: "approve" | "reject" | "ban") => {
    if (selected.size === 0) return;
    setProcessing(true);
    const result = await reviewModerationService.bulkAction(
      Array.from(selected),
      action,
      moderatorAddress,
    );
    setProcessing(false);
    toast.success(`${action}: ${result.succeeded.length} processed`);
    setSelected(new Set());
    await reload({ showLoading: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Flagged" value={stats.totalFlagged} />
          <StatCard
            label="Approved"
            value={`${Math.round(stats.approvedRate * 100)}%`}
          />
          <StatCard
            label="Flag rate"
            value={`${Math.round(stats.flaggedRate * 100)}%`}
          />
          <StatCard
            label="False positives"
            value={`${Math.round(stats.falsePositiveRate * 100)}%`}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={selected.size === 0 || processing}
          onClick={() => void handleBulk("approve")}
        >
          Bulk Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={selected.size === 0 || processing}
          onClick={() => void handleBulk("reject")}
        >
          Bulk Reject
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={selected.size === 0 || processing}
          onClick={() => void handleBulk("ban")}
        >
          Ban Users
        </Button>
      </div>

      {queue.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400 py-8 text-center">
          No flagged reviews in the moderation queue.
        </p>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <FlaggedReviewRow
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FlaggedReviewRow({
  item,
  selected,
  onToggleSelect,
}: {
  item: FlaggedReview;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const derivedRiskScore = useMemo(() => item.riskScore, [item.riskScore]);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          aria-label={`Select review ${item.reviewId}`}
          className="mt-1"
        />
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Risk {derivedRiskScore}/100</Badge>
            {item.flags.map((flag) => (
              <Badge key={flag} variant="secondary">
                {flag}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {item.review.comment}
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>{item.review.projectName}</span>
            <AddressDisplay address={item.review.userAddress} truncated inline />
            <span>{formatDate(item.flaggedAt, "short")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
