"use client";

import { useMemo, useEffect, useState, useRef, Suspense } from "react";
import { projectService } from "@/services/project/project.service";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Search, Filter } from "lucide-react";
import { useDiscoverParams } from "@/hooks/useDiscoverParams";
import type { SortBy } from "@/hooks/useDiscoverParams";

const ITEMS_PER_PAGE = 9;

// ─── Inner component (uses useSearchParams via useDiscoverParams) ──────────────

function DiscoverContent() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const {
    searchInput,
    searchQuery,
    category,
    sortBy,
    page,
    setSearchInput,
    setCategory,
    setSortBy,
    loadNextPage,
    clearFilters,
  } = useDiscoverParams();

  // Simulate initial data fetch
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const categories = projectService.getCategories();

  const filteredAndSortedProjects = useMemo(() => {
    let result = searchQuery
      ? projectService.searchProjects(searchQuery)
      : projectService.getAllProjects();

    if (category !== "All") {
      result = result.filter((p) => p.category === category);
    }

    result = projectService.sortProjects(result, sortBy);
    return result;
  }, [searchQuery, category, sortBy]);

  const filteredCount = filteredAndSortedProjects.length;
  const visibleCount = page * ITEMS_PER_PAGE;
  const visibleProjects = filteredAndSortedProjects.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCount;

  const loadMoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (loadMoreTimerRef.current) {
        clearTimeout(loadMoreTimerRef.current);
      }
    };
  }, []);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    loadMoreTimerRef.current = setTimeout(() => {
      loadNextPage();
      setIsLoadingMore(false);
    }, 600);
  };

  return (
    <main className="min-h-screen pt-8 pb-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        {/* Header & Controls */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Discover Projects
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-8 max-w-2xl">
            Explore the ecosystem of decentralized applications, infrastructure,
            and tools built on Stellar and Soroban.
          </p>

          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {/* Search input — value is the unDebounced `searchInput` so it stays responsive */}
            <div className="flex-1 w-full lg:w-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="search"
                placeholder="Search projects by name or description..."
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Category filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      category === cat
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden lg:block mx-2" />

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                disabled={isInitialLoading}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="rating">Highest Rated</option>
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Initial loading */}
        {isInitialLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Spinner size="lg" className="mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">
              Loading projects...
            </p>
          </div>
        ) : filteredCount > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <Filter className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No projects found</h3>
            <p className="text-zinc-500">
              Try adjusting your search or filters to find what you&apos;re
              looking for.
            </p>
            <Button variant="outline" className="mt-6" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Load More */}
        {!isInitialLoading && hasMore && visibleProjects.length > 0 && (
          <div className="flex justify-center mt-10">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleLoadMore}
              isLoading={isLoadingMore}
              className="w-full sm:w-auto min-w-50"
            >
              {!isLoadingMore && "Load More Projects"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Page export — Suspense boundary required by useSearchParams ───────────────

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-8 pb-24 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
          <Spinner size="lg" />
        </main>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
