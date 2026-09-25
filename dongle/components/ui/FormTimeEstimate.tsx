import { Clock3 } from "lucide-react";

interface FormTimeEstimateProps {
  fieldCount: number;
  completedFields: number;
  secondsPerField?: number;
}

export function FormTimeEstimate({
  fieldCount,
  completedFields,
  secondsPerField = 30,
}: FormTimeEstimateProps) {
  const total = Math.max(0, fieldCount);
  const completed = Math.min(total, Math.max(0, completedFields));
  const remaining = total - completed;
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
  const minutes = Math.max(1, Math.ceil((remaining * secondsPerField) / 60));
  const progressMessage =
    remaining === 0
      ? "Everything's filled in. Ready to submit."
      : completed === 0
        ? "A few details to get started."
        : percent >= 75
          ? "Almost there."
          : "You're making progress.";

  return (
    <div
      className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm">
        <Clock3 className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          {remaining === 0
            ? "Ready to submit"
            : `About ${minutes} minute${minutes === 1 ? "" : "s"} remaining`}
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {completed} of {total} fields complete
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-label="Form completion"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {progressMessage}
      </p>
    </div>
  );
}