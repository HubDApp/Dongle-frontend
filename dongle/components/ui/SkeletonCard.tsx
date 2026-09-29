import React from 'react';
import { Skeleton } from './skeleton';
import { Card } from './Card';

export function SkeletonCard({ variant = "default", padding = "md" }: { variant?: "default" | "glass" | "outline"; padding?: "none" | "sm" | "md" | "lg" }) {
  return (
    <Card variant={variant} padding={padding}>
      <div className="space-y-4">
        {/* Image skeleton */}
        <Skeleton className="h-48 w-full rounded-lg" />
        
        {/* Title skeleton */}
        <Skeleton className="h-6 w-3/4" />
        
        {/* Description skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        
        {/* Tags skeleton */}
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        
        {/* Rating skeleton */}
        <Skeleton className="h-4 w-32" />
      </div>
    </Card>
  );
}
