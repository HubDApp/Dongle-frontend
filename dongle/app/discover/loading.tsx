// Loading UI for Discover page
"use client";

export default function Loading() {
  return (
    <main className="min-h-screen pt-8 pb-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        {/* Header placeholder */}
        <div className="mb-12 animate-pulse">
          <div className="h-12 w-1/3 bg-gray-200 rounded dark:bg-gray-700 mb-4"></div>
          <div className="h-6 w-2/3 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
        {/* Filter bar placeholder */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8 animate-pulse">
          <div className="h-10 w-40 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="h-10 w-24 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
        {/* Grid of card placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
          ))}
        </div>
      </div>
    </main>
  );
}
