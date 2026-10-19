/**
 * Funnel and engagement analysis (Issue #706). A session reaches a step when
 * it emitted a matching event after reaching the previous step.
 */

import type { AnalyticsEvent } from "./types";

type StepMatcher = (event: AnalyticsEvent) => boolean;
export type FunnelDefinition = { id: string; steps: Array<[label: string, match: StepMatcher]> };
export type FunnelStepResult = { label: string; sessions: number; conversionRate: number | null; dropOff: number };

const page = (path: string): StepMatcher => (e) => e.name === "page_view" && e.properties?.path === path;
const named = (name: AnalyticsEvent["name"]): StepMatcher => (e) => e.name === name;

export const FUNNELS: FunnelDefinition[] = [
  { id: "discovery", steps: [["Homepage", page("/")], ["Discover", page("/discover")], ["Project Detail", named("project_view")]] },
  { id: "review", steps: [["Project Detail", named("project_view")], ["Connect Wallet", named("wallet_connect")], ["Submit Review", named("review_submit")]] },
  { id: "verification", steps: [["Submit Project", named("project_submit")], ["Verification Request", named("verification_request")]] },
];

function bySession(events: AnalyticsEvent[]): AnalyticsEvent[][] {
  const sessions = new Map<string, AnalyticsEvent[]>();
  for (const e of events) sessions.set(e.sessionId, [...(sessions.get(e.sessionId) ?? []), e]);
  return [...sessions.values()].map((s) => s.sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
}

export function computeFunnel(funnel: FunnelDefinition, events: AnalyticsEvent[]): FunnelStepResult[] {
  const reached = funnel.steps.map(() => 0);
  for (const session of bySession(events)) {
    let step = 0;
    for (const e of session) if (step < funnel.steps.length && funnel.steps[step][1](e)) step++;
    for (let i = 0; i < step; i++) reached[i]++;
  }
  return funnel.steps.map(([label], i) => ({
    label,
    sessions: reached[i],
    conversionRate: i > 0 && reached[i - 1] ? reached[i] / reached[i - 1] : null,
    dropOff: i > 0 ? reached[i - 1] - reached[i] : 0,
  }));
}

/** Average ms between a page view and the next one in the same session. */
export function averageTimeOnPage(events: AnalyticsEvent[]): Record<string, number> {
  const totals: Record<string, { ms: number; n: number }> = {};
  for (const session of bySession(events)) {
    const views = session.filter((e) => e.name === "page_view");
    views.slice(0, -1).forEach((v, i) => {
      const t = (totals[String(v.properties?.path)] ??= { ms: 0, n: 0 });
      t.ms += Date.parse(views[i + 1].timestamp) - Date.parse(v.timestamp);
      t.n++;
    });
  }
  return Object.fromEntries(Object.entries(totals).map(([path, t]) => [path, t.ms / t.n]));
}
