"use client";

interface ReviewCaptchaFieldProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function ReviewCaptchaField({
  value,
  onChange,
  required = false,
}: ReviewCaptchaFieldProps) {
  if (!required) return null;

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
        CAPTCHA required — high review velocity detected
      </p>
      <label className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter <strong>DONGLE</strong> to confirm you are not a bot
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          placeholder="Type DONGLE"
          aria-required
        />
      </label>
    </div>
  );
}

export function isCaptchaValid(token: string): boolean {
  return token.trim().toUpperCase() === "DONGLE";
}
