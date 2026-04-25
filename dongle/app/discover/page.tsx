"use client";

import Link from "next/link";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { useProjectFilters, type SortOption } from "@/hooks/useProjectFilters";
import { ALL_CATEGORIES, type ProjectCategory } from "@/data/projects";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "rating", label: "Top Rated" },
  { value: "recency", label: "Newest" },
  { value: "reviews", label: "Most Reviewed" },
];

export default function DiscoverPage() {
  const { filters, filtered, setCategory, setSort, hydrated } =
    useProjectFilters(); // no limit — show all

  return (
    <LayoutWrapper>
      <section className="py-24 min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-10">
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-blue-500 transition-colors mb-4 inline-flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to home
            </Link>
            <h1 className="text-4xl font-bold mb-3">Discover Projects</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Browse all dApps and protocols built on Stellar.
            </p>
          </div>

          {/* Filters */}
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
              <label htmlFor="discover-sort" className="sr-only">
                Sort projects
              </label>
              <select
                id="discover-sort"
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

          {/* Result count */}
          {hydrated && (
            <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-6">
              {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
            </p>
          )}

          {/* Grid */}
          {!hydrated ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
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
                <div
                  key={project.id}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-xl transition-all"
                >
                  <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-700 font-bold text-lg">
                      {project.name[0]}
                    </div>
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      {project.category}
                    </span>
                    <div
                      className="flex items-center gap-1 text-sm font-bold"
                      aria-label={`Rating: ${project.rating}`}
                    >
                      <svg
                        className="w-4 h-4 text-yellow-500 fill-current"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {project.rating}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 line-clamp-2">
                    {project.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-zinc-400 dark:text-zinc-500">
                      {project.reviews} reviews
                    </div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500">
                      {new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </LayoutWrapper>
  );
}
