import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Background Mesh/Grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glowing blobs */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-600/10 blur-[150px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-600/10 blur-[150px] -z-10" />

      <div className="max-w-2xl w-full text-center relative z-10 animate-fade-in">
        <AlertTriangle className="mx-auto h-16 w-16 text-blue-500 dark:text-blue-400" />
        <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            404
          </span>
        </h1>
        <p className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Page Not Found
        </p>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-full hover:scale-105 transition-all shadow-xl shadow-blue-500/10 dark:shadow-none"
          >
            Home
          </Link>
          <Link
            href="/discover"
            className="px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Discover Projects
          </Link>
          <Link
            href="/projects/new"
            className="px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Submit a Project
          </Link>
        </div>
      </div>
    </main>
  );
}
