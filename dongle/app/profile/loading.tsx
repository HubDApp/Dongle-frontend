// Loading UI for Profile page
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
        {/* Wallet address placeholder */}
        <div className="h-10 w-3/4 bg-gray-200 rounded dark:bg-gray-700 mb-8 animate-pulse"></div>
        {/* Balances placeholder */}
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded dark:bg-gray-700"></div>
          ))}
        </div>
        {/* Reviews placeholder */}
        <div className="mt-12 space-y-6 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded dark:bg-gray-700"></div>
          ))}
        </div>
      </div>
    </main>
  );
}
