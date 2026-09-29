import React from 'react';
import { Skeleton } from './skeleton';

export function SkeletonList({ 
  count = 5,
  height = "h-12",
  className = ""
}: { 
  count?: number; 
  height?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {/* Avatar skeleton */}
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          
          {/* Action skeleton */}
          <Skeleton className={`${height} w-20 rounded-lg`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ 
  count = 9,
  columns = 3,
  className = ""
}: { 
  count?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          {/* Image skeleton */}
          <Skeleton className="h-48 w-full rounded-lg" />
          
          {/* Title skeleton */}
          <Skeleton className="h-5 w-4/5" />
          
          {/* Description skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
