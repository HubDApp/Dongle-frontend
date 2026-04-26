"use client";

import Link from "next/link";
import { useProjectFilters, type SortOption } from "@/hooks/useProjectFilters";
import { ALL_CATEGORIES, type ProjectCategory } from "@/data/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "rating", label: "Top Rated" },
  { value: "recency", label: "Newest" },
  { value: "reviews", label: "Most Reviewed" },
];

export default function FeaturedProjects() {
  const { filters, filtered, setCategory, setSort, hydrated } =
    useProjectFilters(6);

  return (
    <section className="py-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-4">Featured Projects</h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              Discover the most trusted and highly-rated dApps on Stellar.
            </p>
          </div>
          <Link
            href="/discover"
            className="text-sm font-semibold flex items-center gap-2 hover:gap-3 transition-all underline underline-offset-4"
          >
            View all projects
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by category"
          >
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat as ProjectCategory)}
                aria-pressed={filters.category === cat}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  filters.category === cat
                    ? "bg-blue-500 text-white"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-400 hover:text-blue-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="sm:ml-auto">
            <label htmlFor="sort-select" className="sr-only">
              Sort projects
            </label>
            <select
              id="sort-select"
              value={filters.sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full px-3 py-1.5 text-zinc-600 dark:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!hydrated ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 animate-pulse"
              >
                <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6" />
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3 mb-4" />
                <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3 mb-3" />
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-400 dark:text-zinc-600">
            No projects found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
