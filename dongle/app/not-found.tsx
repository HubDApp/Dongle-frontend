"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 px-4 py-16">
      <div className="max-w-2xl w-full text-center">
        <AlertTriangle className="mx-auto h-16 w-16 text-zinc-400 dark:text-zinc-600" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Page Not Found
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Oops! The page you’re looking for doesn’t exist.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" passHref>
            <Button variant="primary">Home</Button>
          </Link>
          <Link href="/discover" passHref>
            <Button variant="secondary">Discover Projects</Button>
          </Link>
          <Link href="/projects/new" passHref>
            <Button variant="outline">Submit a Project</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
