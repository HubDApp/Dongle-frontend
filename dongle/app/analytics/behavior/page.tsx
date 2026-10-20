"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadCsv, toCsv } from "@/lib/analytics-dashboard/csv";
import { FUNNELS, averageTimeOnPage, computeFunnel, getRecordedEvents } from "@/lib/analytics";
import type { AnalyticsEvent } from "@/lib/analytics";

function formatRate(value: number | null): string {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export default function BehaviorAnalyticsPage() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  useEffect(() => setEvents(getRecordedEvents()), []);

  const results = FUNNELS.map((f) => ({ id: f.id, steps: computeFunnel(f, events) }));
  const timeOnPage = averageTimeOnPage(events);

  const exportCsv = () => {
    const rows = results.flatMap((f) => f.steps.map((s) => [f.id, s.label, s.sessions, s.conversionRate?.toFixed(4), s.dropOff]));
    downloadCsv("dongle-funnels.csv", toCsv(["funnel", "step", "sessions", "conversion_rate", "drop_off"], rows));
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">User Journey</h1>
        <Button onClick={exportCsv}>Export CSV</Button>
      </header>
      {results.map((f) => (
        <section key={f.id} className="mb-8">
          <h2 className="mb-2 text-lg font-semibold capitalize">{f.id} funnel</h2>
          <table className="w-full text-left text-sm">
            <thead><tr><th>Step</th><th>Sessions</th><th>Conversion</th><th>Drop-off</th></tr></thead>
            <tbody>
              {f.steps.map((s) => (
                <tr key={s.label}>
                  <td>{s.label}</td><td>{s.sessions}</td>
                  <td>{formatRate(s.conversionRate)}</td><td>{s.dropOff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Time on page</h2>
        <ul className="text-sm">
          {Object.entries(timeOnPage).map(([path, ms]) => (
            <li key={path}>{path}: {(ms / 1000).toFixed(1)}s</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
