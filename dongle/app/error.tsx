"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  // Log the error for debugging (won't be shown to users)
  useEffect(() => {
    console.error(error);
  }, [error]);

  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 px-4 py-16">
      <div className="max-w-md w-full text-center">
        <AlertTriangle className="mx-auto h-16 w-16 text-zinc-400 dark:text-zinc-600" />
        <h1 className="mt-6 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Something went wrong
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          An unexpected error occurred. You can retry the operation or return to the home page.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="primary" onClick={() => reset()}>
            Retry
          </Button>
          <Button variant="secondary" onClick={() => router.push('/') }>
            Home
          </Button>
        </div>
      </div>
    </main>
  );
}
