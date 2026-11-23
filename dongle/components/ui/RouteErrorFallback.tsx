"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

interface RouteErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Short, user-facing context for this route (e.g. "reviews") */
  section?: string;
  homeHref?: string;
}

/**
 * Shared, user-friendly error UI for Next.js route `error.tsx` boundaries.
 * Logs the error for debugging; never surfaces stack traces to users.
 */
export function RouteErrorFallback({
  error,
  reset,
  section,
  homeHref = "/",
}: RouteErrorFallbackProps) {
  const router = useRouter();

  useEffect(() => {
    console.error(section ? `[${section}] An unexpected route error` : "[route] An unexpected error");
  }, [error, section]);

  const heading = section
    ? `Something went wrong in ${section}`
    : "Something went wrong";

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <AlertTriangle
          className="mx-auto h-14 w-14 text-zinc-400 dark:text-zinc-600"
          aria-hidden="true"
        />
        <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {heading}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          An unexpected error occurred. You can try again or go back home.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="secondary" onClick={() => router.push(homeHref)}>
            Home
          </Button>
        </div>
      </div>
    </main>
  );
}
