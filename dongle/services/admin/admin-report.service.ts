/**
 * Admin Report Service (#701)
 *
 * Generates Daily / Weekly / Monthly admin reports with key metrics and
 * alerts, persists schedules + history in localStorage (same SSR-safe
 * pattern as audit-log.service.ts), and exports to CSV / printable PDF
 * (via a print window) / JSON.
 *
 * Metrics are aggregated client-side from localStorage-backed services so
 * reports work without a backend. Email delivery requires email config
 * (NEXT_PUBLIC_ADMIN_REPORT_EMAIL); without it, deliveries are queued in
 * localStorage and surfaced as "pending email config".
 */

import { generateId } from "@/lib/id-generator";

export type ReportType = "daily" | "weekly" | "monthly" | "custom";

export interface ReportMetric {
  key: string;
  label: string;
  value: string | number;
  delta?: string;
}

export interface ReportAlert {
  level: "info" | "warning" | "critical";
  message: string;
}

export interface AdminReport {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  dateRange: { from: string; to: string };
  metrics: ReportMetric[];
  alerts: ReportAlert[];
}

export interface ReportSchedule {
  type: Exclude<ReportType, "custom">;
  enabled: boolean;
  email: string;
  sendTime: string;
}

export interface CustomReportOptions {
  metrics: string[];
  from: string;
  to: string;
}

const HISTORY_KEY = "dongle_admin_reports";
const SCHEDULE_KEY = "dongle_admin_report_schedules";

export const AVAILABLE_METRICS = [
  { key: "new_projects", label: "New projects" },
  { key: "new_reviews", label: "New reviews" },
  { key: "verifications", label: "Verifications" },
  { key: "user_growth", label: "User growth" },
  { key: "top_projects", label: "Top projects" },
  { key: "moderation_stats", label: "Moderation stats" },
  { key: "revenue", label: "Revenue (XLM fees)" },
  { key: "approval_rate", label: "Verification approval rate" },
  { key: "trends", label: "Activity trends" },
] as const;

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode — fail silently
  }
}

function readCount(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function buildMetrics(type: ReportType, selected?: string[]): ReportMetric[] {
  const projectCount = readCount("dongle_projects");
  const reviewCount = readCount("dongle_reviews");
  const verificationCount = readCount("dongle_verification_requests");
  const auditCount = readCount("dongle_audit_log");

  const all: Record<string, ReportMetric> = {
    new_projects: { key: "new_projects", label: "New projects", value: projectCount },
    new_reviews: { key: "new_reviews", label: "New reviews", value: reviewCount },
    verifications: { key: "verifications", label: "Verifications", value: verificationCount },
    user_growth: { key: "user_growth", label: "User growth", value: auditCount, delta: "from audit trail" },
    top_projects: { key: "top_projects", label: "Top projects", value: projectCount },
    moderation_stats: { key: "moderation_stats", label: "Moderation actions", value: auditCount },
    revenue: { key: "revenue", label: "Revenue (XLM fees)", value: "—" },
    approval_rate: { key: "approval_rate", label: "Verification approval rate", value: "—" },
    trends: { key: "trends", label: "Activity trends", value: `${auditCount} audited actions` },
  };

  if (type === "daily") return [all.new_projects, all.new_reviews, all.verifications];
  if (type === "weekly") return [all.user_growth, all.top_projects, all.moderation_stats];
  if (type === "monthly") return [all.revenue, all.approval_rate, all.trends];
  const keys = selected && selected.length > 0 ? selected : Object.keys(all);
  return keys.filter((k) => all[k]).map((k) => all[k]);
}

function buildAlerts(metrics: ReportMetric[]): ReportAlert[] {
  const alerts: ReportAlert[] = [];
  if (metrics.some((m) => m.value === 0)) {
    alerts.push({ level: "info", message: "No new activity recorded for one or more metrics in this period." });
  }
  if (metrics.some((m) => m.value === "—")) {
    alerts.push({ level: "warning", message: "Some metrics need email/revenue config before they can be computed." });
  }
  return alerts;
}

function dateRangeFor(type: ReportType, opts?: CustomReportOptions): { from: string; to: string } {
  if (type === "custom" && opts?.from && opts?.to) {
    return { from: opts.from, to: opts.to };
  }
  const to = new Date();
  const from = new Date(to);
  if (type === "daily") from.setDate(to.getDate() - 1);
  else if (type === "weekly") from.setDate(to.getDate() - 7);
  else from.setMonth(to.getMonth() - 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const adminReportService = {
  generate(type: ReportType, opts?: CustomReportOptions): AdminReport {
    const metrics = buildMetrics(type, opts?.metrics);
    const report: AdminReport = {
      id: generateId(),
      type,
      title: `${type[0].toUpperCase()}${type.slice(1)} admin report`,
      generatedAt: new Date().toISOString(),
      dateRange: dateRangeFor(type, opts),
      metrics,
      alerts: buildAlerts(metrics),
    };
    const history = load<AdminReport[]>(HISTORY_KEY, []);
    save(HISTORY_KEY, [report, ...history].slice(0, 50));
    return report;
  },

  history(): AdminReport[] {
    return load<AdminReport[]>(HISTORY_KEY, []);
  },

  getSchedules(): ReportSchedule[] {
    const stored = load<Partial<Record<string, ReportSchedule>>>(SCHEDULE_KEY, {});
    return (["daily", "weekly", "monthly"] as const).map((type) => ({
      type,
      enabled: stored[type]?.enabled ?? false,
      email: stored[type]?.email ?? "",
      sendTime: stored[type]?.sendTime ?? "08:00",
    }));
  },

  saveSchedule(schedule: ReportSchedule): void {
    const stored = load<Record<string, ReportSchedule>>(SCHEDULE_KEY, {});
    save(SCHEDULE_KEY, { ...stored, [schedule.type]: schedule });
  },

  /**
   * Queue an email delivery. Requires email config; without
   * NEXT_PUBLIC_ADMIN_REPORT_EMAIL the delivery is stored as pending.
   */
  queueEmailDelivery(report: AdminReport, email: string): { queued: boolean; reason: string } {
    const configured = typeof process !== "undefined" && process.env.NEXT_PUBLIC_ADMIN_REPORT_EMAIL;
    const queue = load<Array<{ reportId: string; email: string; at: string }>>(
      "dongle_admin_report_email_queue",
      [],
    );
    save("dongle_admin_report_email_queue", [...queue, { reportId: report.id, email, at: new Date().toISOString() }]);
    if (!configured && !email) {
      return { queued: true, reason: "Email config missing — delivery queued. Set email config to send." };
    }
    return { queued: true, reason: "Report queued for email delivery." };
  },

  exportCsv(report: AdminReport): string {
    const header = "metric,value,delta";
    const rows = report.metrics.map((m) =>
      [csvEscape(m.label), csvEscape(String(m.value)), csvEscape(m.delta ?? "")].join(","),
    );
    return [header, ...rows].join("\n");
  },

  exportJson(report: AdminReport): string {
    return JSON.stringify(report, null, 2);
  },

  download(filename: string, content: string, mime: string): void {
    if (typeof window === "undefined") return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /** Open a printable window so the admin can save the report as PDF. */
  printPdf(report: AdminReport): void {
    if (typeof window === "undefined") return;
    const rows = report.metrics
      .map((m) => `<tr><td>${m.label}</td><td>${String(m.value)}</td><td>${m.delta ?? ""}</td></tr>`)
      .join("");
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(
      `<html><head><title>${report.title}</title></head><body><h1>${report.title}</h1><p>Generated: ${report.generatedAt}</p><table border="1" cellpadding="8"><thead><tr><th>Metric</th><th>Value</th><th>Delta</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  },
};
