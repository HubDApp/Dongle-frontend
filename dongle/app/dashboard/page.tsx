"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Bell, Bookmark, GripVertical, RefreshCw, ShieldCheck, Star } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useNotifications } from "@/context/notification.context";
import { projectService } from "@/services/project/project.service";
import { reviewService } from "@/services/review/review.service";
import { verificationService, type VerificationRequest } from "@/services/stellar/verification.service";
import type { Review } from "@/types/review";

type WidgetId = "bookmarks" | "reviews" | "trending" | "verifications" | "notifications";
type Timeframe = "7d" | "30d" | "90d";

const DEFAULT_LAYOUT: WidgetId[] = ["bookmarks", "reviews", "trending", "verifications", "notifications"];
const LAYOUT_KEY = "dongle_dashboard_layout:";

function loadLayout(key: string): { order: WidgetId[]; timeframe: Timeframe } {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null") as { order?: unknown; timeframe?: unknown } | null;
    const validIds = new Set(DEFAULT_LAYOUT);
    const order = Array.isArray(value?.order)
      ? [...new Set(value.order.filter((id): id is WidgetId => typeof id === "string" && validIds.has(id as WidgetId)))]
      : [];
    return {
      order: [...order, ...DEFAULT_LAYOUT.filter((id) => !order.includes(id))],
      timeframe: value?.timeframe === "7d" || value?.timeframe === "90d" ? value.timeframe : "30d",
    };
  } catch {
    return { order: DEFAULT_LAYOUT, timeframe: "30d" };
  }
}

export default function DashboardPage() {
  const { isAdmin, gate } = useAdminAccess();
  const { watchlistProjects } = useWatchlist();
  const { items: notifications } = useNotifications();
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_LAYOUT);
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const preferenceKey = `${LAYOUT_KEY}${gate.publicKey ?? "anonymous"}`;

  useEffect(() => {
    const saved = loadLayout(preferenceKey);
    setOrder(saved.order);
    setTimeframe(saved.timeframe);
  }, [preferenceKey]);

  useEffect(() => {
    localStorage.setItem(preferenceKey, JSON.stringify({ order, timeframe }));
  }, [order, preferenceKey, timeframe]);

  useEffect(() => {
    let cancelled = false;
    if (!gate.publicKey) {
      setReviews([]);
      return;
    }
    void reviewService.getReviewsByUser(gate.publicKey).then((result) => {
      if (!cancelled) setReviews(result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    });
    return () => { cancelled = true; };
  }, [gate.publicKey, refreshVersion]);

  useEffect(() => {
    let cancelled = false;
    if (!isAdmin) {
      setVerificationRequests([]);
      return;
    }
    void verificationService.getPendingRequests().then((result) => {
      if (!cancelled) setVerificationRequests(result);
    });
    return () => { cancelled = true; };
  }, [isAdmin, refreshVersion]);

  const trendingProjects = useMemo(() => {
    const days = Number.parseInt(timeframe, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const categories = new Set(watchlistProjects.map((project) => project.primaryCategory));
    return projectService.getDiscoverableProjects()
      .filter((project) => categories.size === 0 || categories.has(project.primaryCategory))
      .filter((project) => new Date(project.createdAt).getTime() >= cutoff)
      .sort((a, b) => b.reviews - a.reviews || b.rating - a.rating)
      .slice(0, 5);
  }, [timeframe, watchlistProjects]);

  const refresh = useCallback(() => setRefreshVersion((version) => version + 1), []);

  const moveWidget = (target: WidgetId) => {
    if (!draggedWidget || draggedWidget === target) return;
    setOrder((current) => {
      const next = current.filter((id) => id !== draggedWidget);
      next.splice(next.indexOf(target), 0, draggedWidget);
      return next;
    });
    setDraggedWidget(null);
  };

  const resetLayout = () => {
    setOrder(DEFAULT_LAYOUT);
    setTimeframe("30d");
  };

  const visibleWidgets = order.filter((id) => id !== "verifications" || isAdmin);

  return (
    <main className="min-h-screen bg-zinc-50 pb-16 pt-28 dark:bg-zinc-950">
      <div className="container mx-auto max-w-6xl px-4">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your activity and followed projects</p>
          </div>
          <button type="button" onClick={resetLayout} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900">
            Reset to default
          </button>
        </header>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-label="Dashboard widgets">
          {visibleWidgets.map((widget) => (
            <article
              key={widget}
              draggable
              onDragStart={() => setDraggedWidget(widget)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveWidget(widget)}
              onDragEnd={() => setDraggedWidget(null)}
              className={`min-w-0 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${draggedWidget === widget ? "opacity-50" : ""}`}
            >
              <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <h2 className="flex min-w-0 items-center gap-2 font-semibold">
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-zinc-400" aria-hidden="true" />
                  {widget === "bookmarks" ? <><Bookmark className="h-4 w-4" /> Bookmarked projects</> : null}
                  {widget === "reviews" ? <><Star className="h-4 w-4" /> Recent reviews</> : null}
                  {widget === "trending" ? <><Activity className="h-4 w-4" /> Trending in followed categories</> : null}
                  {widget === "verifications" ? <><ShieldCheck className="h-4 w-4" /> Verification requests</> : null}
                  {widget === "notifications" ? <><Bell className="h-4 w-4" /> Notifications</> : null}
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  {widget === "trending" ? (
                    <select aria-label="Trending timeframe" value={timeframe} onChange={(event) => setTimeframe(event.target.value as Timeframe)} className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-700">
                      <option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option>
                    </select>
                  ) : null}
                  <button type="button" onClick={refresh} aria-label="Refresh widget" title="Refresh widget" className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </header>
              <div className="p-4">
                {widget === "bookmarks" ? (
                  watchlistProjects.length ? <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">{watchlistProjects.slice(0, 5).map((project) => <li key={project.id} className="py-2 first:pt-0 last:pb-0"><Link className="font-medium hover:text-blue-600" href={`/projects/${project.id}`}>{project.name}</Link><span className="ml-2 text-xs text-zinc-500">{project.primaryCategory}</span></li>)}</ul> : <p className="text-sm text-zinc-500">No bookmarked projects yet.</p>
                ) : null}
                {widget === "reviews" ? (
                  reviews.length ? <ul className="space-y-3">{reviews.slice(0, 5).map((review) => <li key={review.id}><Link className="font-medium hover:text-blue-600" href={`/projects/${review.projectId}`}>{review.projectName}</Link><p className="line-clamp-2 text-sm text-zinc-500">{review.comment}</p></li>)}</ul> : <p className="text-sm text-zinc-500">No recent reviews.</p>
                ) : null}
                {widget === "trending" ? (
                  trendingProjects.length ? <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">{trendingProjects.map((project) => <li key={project.id} className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0"><Link className="truncate font-medium hover:text-blue-600" href={`/projects/${project.id}`}>{project.name}</Link><span className="shrink-0 text-xs text-zinc-500">{project.reviews} reviews</span></li>)}</ul> : <p className="text-sm text-zinc-500">No trending projects for this timeframe.</p>
                ) : null}
                {widget === "verifications" ? (
                  verificationRequests.length ? <ul className="space-y-2">{verificationRequests.slice(0, 5).map((request) => <li key={request.id} className="flex justify-between gap-3 text-sm"><Link className="truncate font-medium hover:text-blue-600" href={`/projects/${request.projectId}`}>{request.projectName}</Link><span className="shrink-0 text-zinc-500">{request.status}</span></li>)}</ul> : <p className="text-sm text-zinc-500">No pending verification requests.</p>
                ) : null}
                {widget === "notifications" ? (
                  notifications.length ? <ul className="space-y-2">{notifications.slice(0, 5).map((notification) => <li key={notification.id} className="flex gap-2 text-sm"><span className={notification.read ? "text-zinc-400" : "text-blue-600"}>{notification.title}</span>{notification.projectId ? <Link className="ml-auto shrink-0 text-xs text-blue-600 hover:underline" href={`/projects/${notification.projectId}`}>View</Link> : null}</li>)}</ul> : <p className="text-sm text-zinc-500">No notifications yet.</p>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
