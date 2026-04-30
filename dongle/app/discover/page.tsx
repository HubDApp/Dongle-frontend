"use client";

import { useState, useMemo, useEffect } from "react";
import { mockProjects } from "@/data/mockProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Search, Filter, Package } from "lucide-react";

const ITEMS_PER_PAGE = 9;

export default function DiscoverPage() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"rating" | "newest" | "popular">("rating");
  // page resets to 1 whenever filters change via the setter helpers below
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Simulate initial data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const categories = [
    "All",
    ...Array.from(new Set(mockProjects.map((p) => p.category))),
  ];

  const filteredAndSortedProjects = useMemo(() => {
    let result = mockProjects;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    if (selectedCategory !== "All") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "popular") return b.reviews - a.reviews;
      if (sortBy === "newest")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });
    return result;
  }, [searchQuery, selectedCategory, sortBy]);

  const visibleCount = page * ITEMS_PER_PAGE;
  const visibleProjects = filteredAndSortedProjects.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSortedProjects.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setPage((p) => p + 1);
      setIsLoadingMore(false);
    }, 600);
  };

  const handleSearchChange = (q: string) => { setSearchQuery(q); setPage(1); };
  const handleCategoryChange = (cat: string) => { setSelectedCategory(cat); setPage(1); };
  const handleSortChange = (s: "rating" | "newest" | "popular") => { setSortBy(s); setPage(1); };

  return (
      <main className="min-h-screen pt-8 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4">
          {/* Header & Controls */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Discover Projects
            </h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-8 max-w-2xl">
              Explore the ecosystem of decentralized applications,
              infrastructure, and tools built on Stellar and Soroban.
            </p>

            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex-1 w-full lg:w-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search projects by name or description..."
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        selectedCategory === cat
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden lg:block mx-2" />

                <select
                  value={sortBy}
                  onChange={(e) =>
                    handleSortChange(e.target.value as "rating" | "newest" | "popular")
                  }
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

          {/* Loading State */}
          {isInitialLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Spinner size="lg" className="mb-4" />
              <p className="text-zinc-500 dark:text-zinc-400">Loading projects...</p>
            </div>
          ) : (
            <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Filter className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No projects found</h3>
              <p className="text-zinc-500">
                Try adjusting your search or filters to find what you&apos;re
                looking for.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  handleSearchChange("");
                  handleCategoryChange("All");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Load More Pagination */}
          {hasMore && visibleProjects.length > 0 && (
            <div className="flex justify-center">
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
