"use client";

import { useEffect, useState } from "react";
import { isTxSoundEnabled, setTxSoundEnabled } from "@/lib/pending-transactions";

/** User settings for pending-transaction completion alerts. */
export function TransactionNotificationSettings() {
  const [sound, setSound] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setSound(isTxSoundEnabled());
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  return (
    <section className="mb-6 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 space-y-3">
      <h2 className="font-semibold">Transaction alerts</h2>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sound}
          onChange={(e) => {
            setSound(e.target.checked);
            setTxSoundEnabled(e.target.checked);
          }}
        />
        Play a sound when a pending transaction completes
      </label>
      {permission === "default" && (
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => void Notification.requestPermission().then(setPermission)}
        >
          Enable desktop notifications
        </button>
      )}
      {permission === "denied" && (
        <p className="text-xs text-zinc-500">Desktop notifications are blocked in your browser settings.</p>
      )}
    </section>
  );
}

export default TransactionNotificationSettings;
