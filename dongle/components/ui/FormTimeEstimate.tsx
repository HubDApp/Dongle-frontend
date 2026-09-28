import { useState } from "react";
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
      ? "All the details are in. Nice work, you're ready to submit."
      : completed === 0
        ? "Every project starts with an idea. Add your first details when you're ready."
        : percent >= 75
          ? "Three quarters done. You're close to sharing your project."
          : percent >= 50
            ? "Halfway there. The core details are taking shape."
            : percent >= 25
              ? "Great start. You're building a clear picture of your project."
              : "Nice start. Every detail brings your project to life.";
  const [showEncouragement, setShowEncouragement] = useState(true);

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
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {showEncouragement && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {progressMessage}
          </p>
        )}
        <label className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={showEncouragement}
            onChange={(event) => setShowEncouragement(event.target.checked)}
            className="accent-emerald-600"
          />
          Show encouragement
        </label>
      </div>
    </div>
  );
}