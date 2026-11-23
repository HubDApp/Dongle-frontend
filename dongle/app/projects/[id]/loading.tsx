// Loading UI for Project Detail page
"use client";

export default function Loading() {
  return (
    <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        {/* Header placeholder */}
        <div className="mb-12 animate-pulse">
          <div className="h-12 w-1/3 bg-gray-200 rounded dark:bg-gray-700 mb-4"></div>
          <div className="h-6 w-2/3 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
        {/* Image placeholder */}
        <div className="w-full aspect-video bg-gray-200 rounded dark:bg-gray-700 mb-6 animate-pulse"></div>
        {/* Description placeholder */}
        <div className="mb-8 space-y-3 animate-pulse">
          <div className="h-4 w-3/4 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="h-4 w-1/2 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
        {/* Links placeholder */}
        <div className="flex flex-wrap gap-3 mb-8 animate-pulse">
          <div className="h-8 w-24 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="h-8 w-24 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
        {/* Reviews placeholder */}
        <div className="space-y-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded dark:bg-gray-700"></div>
          ))}
        </div>
      </div>
    </main>
  );
}
