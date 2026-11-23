// Loading UI for Project Edit page
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
        {/* Form fields placeholder */}
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-full bg-gray-200 rounded dark:bg-gray-700"></div>
          ))}
        </div>
        {/* Submit button placeholder */}
        <div className="mt-6">
          <div className="h-10 w-32 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
      </div>
    </main>
  );
}
