"use client";

import { useMemo, useEffect, useState, useRef, Suspense } from "react";
import { projectService } from "@/services/project/project.service";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Search, Filter, X } from "lucide-react";
import { useDiscoverParams } from "@/hooks/useDiscoverParams";
import type { SortBy } from "@/hooks/useDiscoverParams";
import { TagInput } from "@/components/ui/TagInput";
import { batchFetchVerificationStatuses } from "@/services/stellar/batch-verification";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentViews } from "@/hooks/useRecentViews";
import { RecentlyViewedProjects } from "@/components/projects/RecentlyViewedProjects";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { trackSearch, trackFilter } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 9;

// ─── Inner component (uses useSearchParams via useDiscoverParams) ──────────────

function DiscoverContent() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, VerificationStatus>>({});
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus | "ALL">("ALL");
  const gate = useWalletPageGate();
  const { recentProjects, hasHistory } = useRecentViews(gate.publicKey || undefined);

  const {
    searchInput,
    searchQuery,
    categories: selectedCategories,
    tags,
    sortBy,
    page,
    setSearchInput,
    toggleCategory,
    setTags,
    setSortBy,
    loadNextPage,
    clearFilters,
  } = useDiscoverParams();

  // Fetch verification statuses for all projects using batched fetch
  useEffect(() => {
    const controller = new AbortController();

    const fetchVerificationStatuses = async () => {
      const projects = projectService.getDiscoverableProjects();
      const ids = projects.map((p) => p.id);

      const statuses = await batchFetchVerificationStatuses(
        ids,
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setVerificationStatuses(statuses);
        setIsInitialLoading(false);
      }
    };

    void fetchVerificationStatuses();

    return () => {
      controller.abort();
    };
  }, []);

  const categories = projectService.getCategories();

  const filteredAndSortedProjects = useMemo(() => {
    let result = searchQuery
      ? projectService.searchProjects(searchQuery)
      : projectService.getDiscoverableProjects();

    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.primaryCategory));
    }
    
    if (tags && tags.length > 0) {
      result = result.filter((p) => tags.every((t) => p.tags?.includes(t))));
    }

    if (verificationFilter !== "ALL") {
      result = result.filter((p) => verificationStatuses[p.id] === verificationFilter);
    }

    result = projectService.sortProjects(result, sortBy);
    return result;
  }, [searchQuery, selectedCategories, tags, sortBy, verificationFilter, verificationStatuses]);

  const filteredCount = filteredAndSortedProjects.length;
  const visibleCount = page * ITEMS_PER_PAGE;
  const visibleProjects = filteredAndSortedProjects.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCount;

  const loadMoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchRef = useRef<string | null>(null);

  // Emit a privacy-safe search event when the debounced query changes
  useEffect(() => {
    if (isInitialLoading) return;
    if (lastSearchRef.current === searchQuery) return;
    lastSearchRef.current = searchQuery;
    trackSearch({
      queryLength: searchQuery.length,
      resultCount: filteredCount,
      source: "discover",
    });
  }, [searchQuery, filteredCount, isInitialLoading]);

  useEffect(() => {
    return () => {
      if (loadMoreTimerRef.current) {
        clearTimeout(loadMoreTimerRef.current);
      }
    };
  }, []);

  const handleCategoryToggle = (cat: string) => {
    toggleCategory(cat);
    trackFilter({ filterType: "category", filterValue: cat, source: "discover" });
  };

  const handleClearSearch = () => {
    setSearchInput("");
  };

  const handleSortChange = (value: SortBy) => {
    setSortBy(value);
    trackFilter({ filterType: "sort", filterValue: value, source: "discover" });
  };

  const handleVerificationFilterChange = (value: VerificationStatus | "ALL") => {
    setVerificationFilter(value);
    trackFilter({
      filterType: "verification",
      filterValue: value,
      source: "discover",
    });
  };

  const handleTagsChange = (nextTags: string[]) => {
    setTags(nextTags);
    trackFilter({
      filterType: "tags",
      filterValue: nextTags.length > 0 ? `count:${nextTags.length}` : "none",
      source: "discover",
    });
  };

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
                className={cn(
                  "w-full pl-12 pr-11 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                )}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Category filters - multi-select */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
                {categories.map((cat) => {
                  const isAll = cat === "All";
                  const isSelected = isAll
                    ? selectedCategories.length === 0
                    : selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryToggle(cat)}
                      aria-pressed={isSelected}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden lg:block mx-2" />

              {/* Verification Filter */}
              <select
                value={verificationFilter}
                onChange={(e) =>
                  handleVerificationFilterChange(
                    e.target.value as VerificationStatus | "ALL",
                  )
                }
                disabled={isInitialLoading}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="ALL">All Status</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="NONE">Unverified</option>
                <option value="REJECTED">Rejected</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortBy)}
                disabled={isInitialLoading}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="rating">Highest Rated</option>
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
          
          {/* Tags filtering */}
          <div className="mt-4 max-w-xl">
             <TagInput
               label="Filter by Tags"
               tags={tags}
               onChange={handleTagsChange}
               placeholder="Add tags to filter..."
             />
          </div>
        </div>

        {/* Recently Viewed - Show above main content */}
        {!isInitialLoading && hasHistory && (
          <div className="mb-8">
            <RecentlyViewedProjects
              projects={recentProjects.slice(0, 5)}
              compact
            />
          </div>
        )}

        {/* Result count */}
        {!isInitialLoading && (
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {filteredCount}
              </span>{" "}
              project{filteredCount === 1 ? "" : "s"} found
              {(searchQuery || selectedCategories.length > 0 || tags.length > 0) && (
                <span className="text-zinc-400 dark:text-zinc-500">
                  {" "}
                  matching your filters
                </span>
              )}
            </div>
            {(selectedCategories.length > 0 || tags.length > 0 || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-sm"
              >
                Reset all
              </Button>
            )}
          </div>
        )}

        {/* Initial loading */}
        {isInitialLoading ? (
          <div
            aria-busy="true"
            aria-label="Loading projects"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col gap-4"
              >
                {/* Logo placeholder */}
                <Skeleton className="h-40 w-full rounded-2xl" />
                {/* Category + badge row */}
                <div className="flex items-center gap-2 px-2">
                  <Skeleton className="h-5 w-20 rounded" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
                {/* Title */}
                <Skeleton className="h-7 w-3/4 rounded" />
                {/* Description lines */}
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                {/* Footer meta */}
                <div className="flex justify-between mt-auto pt-2">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCount > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project}
                verificationStatus={verificationStatuses[project.id]}
                highlightTerm={searchQuery}
              />
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
