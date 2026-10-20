/**
 * Custom report builder (Issue #710).
 *
 * Pick dimensions (date range, category, verification status), pick metrics
 * (views, reviews, bookmarks, ratings), choose a visualization, save the
 * report and schedule recurring delivery.
 */

import { toCsv } from "@/lib/analytics-dashboard/csv";
import { projects as catalogProjects } from "@/data/projects";
import type { Project, ProjectCategory } from "@/types/project";

export type ReportDimension = "date_range" | "category" | "verification_status";
export type ReportMetric = "views" | "reviews" | "bookmarks" | "ratings";
export type ReportVisualization = "table" | "line" | "bar";
export type ReportFrequency = "daily" | "weekly" | "monthly";

export const REPORT_DIMENSIONS: Array<{ value: ReportDimension; label: string }> = [
  { value: "date_range", label: "Date range" },
  { value: "category", label: "Category" },
  { value: "verification_status", label: "Verification status" },
];

export const REPORT_METRICS: Array<{ value: ReportMetric; label: string }> = [
  { value: "views", label: "Views" },
  { value: "reviews", label: "Reviews" },
  { value: "bookmarks", label: "Bookmarks" },
  { value: "ratings", label: "Rating (avg)" },
];

export interface ReportQuery {
  name: string;
  dimensions: ReportDimension[];
  metrics: ReportMetric[];
  visualization: ReportVisualization;
  /** Restrict rows to one category ("all" or a category label). */
  category: ProjectCategory | "all";
  verificationStatus: "all" | "VERIFIED" | "PENDING" | "REJECTED" | "NONE";
  /** Inclusive YYYY-MM-DD bounds. */
  from?: string;
  to?: string;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: ReportFrequency;
  email: string;
}

export interface SavedReport extends ReportQuery {
  id: string;
  schedule: ReportSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface ReportDatasetItem {
  projectId: string;
  projectName: string;
  category: string;
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED" | "NONE";
  createdAt: string;
  views: number;
  reviews: number;
  bookmarks: number;
  rating: number;
}

export interface ReportRow {
  label: string;
  values: Record<ReportMetric, number>;
}

export interface BuiltReport {
  rows: ReportRow[];
  totals: Record<ReportMetric, number>;
  generatedAt: string;
}

const STORAGE_KEY = "dongle:custom-reports:v1";

export function createDefaultQuery(): ReportQuery {
  return {
    name: "Untitled report",
    dimensions: ["date_range", "category"],
    metrics: ["views", "reviews"],
    visualization: "line",
    category: "all",
    verificationStatus: "all",
  };
}

/** Deterministic sample dataset built from the project catalog. */
export function buildSampleReportDataset(now: Date = new Date()): ReportDatasetItem[] {
  const statuses: ReportDatasetItem["verificationStatus"][] = [
    "VERIFIED",
    "PENDING",
    "REJECTED",
    "NONE",
  ];
  return (catalogProjects as Project[]).map((project, index) => {
    const created = new Date(project.createdAt);
    const ageDays = Math.max(1, (now.getTime() - created.getTime()) / 86_400_000);
    const base = index + 1;
    return {
      projectId: project.id,
      projectName: project.name,
      category: project.primaryCategory,
      verificationStatus: project.verificationTier ? "VERIFIED" : statuses[index % statuses.length],
      createdAt: project.createdAt,
      views: Math.round(ageDays * (12 + base * 3)),
      reviews: project.reviews,
      bookmarks: Math.round(ageDays * (2 + base)),
      rating: project.rating,
    };
  });
}

function monthLabel(iso: string): string {
  return iso.slice(0, 7);
}

function rowLabel(item: ReportDatasetItem, dimensions: ReportDimension[]): string {
  const parts = dimensions.map((dimension) => {
    switch (dimension) {
      case "date_range":
        return monthLabel(item.createdAt);
      case "category":
        return item.category;
      case "verification_status":
        return item.verificationStatus;
      default:
        return "";
    }
  });
  return parts.length > 0 ? parts.join(" · ") : "All data";
}

/** Aggregate the dataset according to the selected dimensions and metrics. */
export function buildReport(
  query: ReportQuery,
  dataset: ReportDatasetItem[] = buildSampleReportDataset(),
): BuiltReport {
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(`${query.to}T23:59:59`) : null;

  const filtered = dataset.filter((item) => {
    if (query.category !== "all" && item.category !== query.category) return false;
    if (query.verificationStatus !== "all" && item.verificationStatus !== query.verificationStatus) {
      return false;
    }
    const created = new Date(item.createdAt);
    if (from && created < from) return false;
    if (to && created > to) return false;
    return true;
  });

  const groups = new Map<string, { sum: Partial<Record<ReportMetric, number>>; ratingSum: number; ratingCount: number }>();

  for (const item of filtered) {
    const label = rowLabel(item, query.dimensions);
    const group =
      groups.get(label) ?? { sum: {}, ratingSum: 0, ratingCount: 0 };
    group.sum.views = (group.sum.views ?? 0) + item.views;
    group.sum.reviews = (group.sum.reviews ?? 0) + item.reviews;
    group.sum.bookmarks = (group.sum.bookmarks ?? 0) + item.bookmarks;
    group.ratingSum += item.rating;
    group.ratingCount += 1;
    groups.set(label, group);
  }

  const emptyTotals = (): Record<ReportMetric, number> => ({
    views: 0,
    reviews: 0,
    bookmarks: 0,
    ratings: 0,
  });

  const rows: ReportRow[] = [...groups.entries()].map(([label, group]) => ({
    label,
    values: {
      views: group.sum.views ?? 0,
      reviews: group.sum.reviews ?? 0,
      bookmarks: group.sum.bookmarks ?? 0,
      ratings: group.ratingCount > 0 ? group.ratingSum / group.ratingCount : 0,
    },
  }));

  rows.sort((a, b) => a.label.localeCompare(b.label));

  const totals = emptyTotals();
  for (const row of rows) {
    totals.views += row.values.views;
    totals.reviews += row.values.reviews;
    totals.bookmarks += row.values.bookmarks;
  }
  totals.ratings =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + row.values.ratings, 0) / rows.length
      : 0;

  return { rows, totals, generatedAt: new Date().toISOString() };
}

export function loadSavedReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(reports: SavedReport[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    /* ignore quota errors */
  }
}

export function saveReport(query: ReportQuery, schedule?: ReportSchedule): SavedReport {
  const reports = loadSavedReports();
  const id = `report-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const saved: SavedReport = {
    ...query,
    id,
    schedule: schedule ?? { enabled: false, frequency: "weekly", email: "" },
    createdAt: now,
    updatedAt: now,
  };
  reports.push(saved);
  persist(reports);
  return saved;
}

export function updateReport(report: SavedReport): SavedReport {
  const reports = loadSavedReports();
  const index = reports.findIndex((r) => r.id === report.id);
  const next = { ...report, updatedAt: new Date().toISOString() };
  if (index >= 0) reports[index] = next;
  else reports.push(next);
  persist(reports);
  return next;
}

export function deleteReport(id: string): void {
  persist(loadSavedReports().filter((report) => report.id !== id));
}

export function toReportCsv(report: BuiltReport, query: ReportQuery): string {
  const headers = ["group", ...query.metrics];
  return toCsv(
    headers,
    report.rows.map((row) => [row.label, ...query.metrics.map((m) => row.values[m].toFixed(m === "ratings" ? 2 : 0))]),
  );
}

/**
 * Export the report as PDF using the browser's print pipeline (the print
 * dialog offers "Save as PDF"), keeping the app free of a heavyweight PDF
 * dependency.
 */
export function exportReportPdf(title: string): void {
  if (typeof window === "undefined") return;
  const previous = document.title;
  document.title = title.replace(/[^\w\s-]/g, "");
  window.print();
  document.title = previous;
}
