'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  query: string;
  status?: 'active' | 'draft' | 'archived';
  dateRange?: 'week' | 'month' | '3months' | 'all';
  minRating?: number;
  sortBy: 'name' | 'rating' | 'date' | 'reviews';
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  status: undefined,
  dateRange: undefined,
  minRating: undefined,
  sortBy: 'date',
  sortOrder: 'desc',
};

interface ProjectSearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

export function ProjectSearch({
  onFiltersChange,
  hasActiveFilters = false,
  onClearFilters,
  className = '',
}: ProjectSearchProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [debouncedTimeout, setDebouncedTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced search handler
  const handleSearchChange = useCallback((query: string) => {
    if (debouncedTimeout) {
      clearTimeout(debouncedTimeout);
    }

    const timeout = setTimeout(() => {
      const newFilters = { ...filters, query };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    }, 300); // 300ms debounce

    setDebouncedTimeout(timeout);
  }, [filters, debouncedTimeout, onFiltersChange]);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
    if (onClearFilters) {
      onClearFilters();
    }
  }, [onFiltersChange, onClearFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.status) count++;
    if (filters.dateRange) count++;
    if (filters.minRating) count++;
    return count;
  }, [filters]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search projects by name..."
            defaultValue={filters.query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'relative',
            activeFilterCount > 0 && 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
          )}
        >
          <Filter className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
              Status
            </label>
            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'draft', 'archived'].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    handleFilterChange('status', status === 'all' ? undefined : status)
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filters.status === (status === 'all' ? undefined : status) ||
                    (status === 'all' && !filters.status)
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  )}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
              Date Range
            </label>
            <select
              value={filters.dateRange || 'all'}
              onChange={(e) =>
                handleFilterChange(
                  'dateRange',
                  e.target.value === 'all' ? undefined : e.target.value
                )
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="3months">Last 3 Months</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
              Minimum Rating
            </label>
            <div className="flex gap-2 flex-wrap">
              {[0, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() =>
                    handleFilterChange('minRating', rating === 0 ? undefined : rating)
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filters.minRating === (rating === 0 ? undefined : rating) ||
                    (rating === 0 && !filters.minRating)
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  )}
                >
                  {rating === 0 ? 'All' : `${rating}+ Stars`}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  handleFilterChange('sortBy', e.target.value as SearchFilters['sortBy'])
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="date">Date Created</option>
                <option value="name">Name (A-Z)</option>
                <option value="rating">Rating</option>
                <option value="reviews">Reviews</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
                Order
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) =>
                  handleFilterChange('sortOrder', e.target.value as SearchFilters['sortOrder'])
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="w-full"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear All Filters
            </Button>
          )}
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Active:</span>
          {filters.query && (
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Search: "{filters.query}"
            </span>
          )}
          {filters.status && (
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Status: {filters.status}
            </span>
          )}
          {filters.dateRange && (
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {filters.dateRange === 'week' && 'Last Week'}
              {filters.dateRange === 'month' && 'Last Month'}
              {filters.dateRange === '3months' && 'Last 3 Months'}
            </span>
          )}
          {filters.minRating && (
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {filters.minRating}+ Stars
            </span>
          )}
        </div>
      )}
    </div>
  );
}
