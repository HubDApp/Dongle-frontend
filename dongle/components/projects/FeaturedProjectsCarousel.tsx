"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, Star } from "lucide-react";
import ProjectImage from "@/components/projects/ProjectImage";
import type { Project } from "@/types/project";
import { FEATURED_CHANGED_EVENT, getFeaturedProjects } from "@/lib/featured-projects";
import { trackFeaturedProjectView } from "@/lib/analytics";

const ROTATE_MS = 5000;

export function FeaturedProjectsCarousel({ projects }: { projects: Project[] }) {
  const [featured, setFeatured] = useState<Project[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const refresh = () => setFeatured(getFeaturedProjects(projects));
    refresh();
    window.addEventListener(FEATURED_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(FEATURED_CHANGED_EVENT, refresh);
  }, [projects]);

  const count = featured.length;
  const current = featured[index % Math.max(count, 1)];

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    if (current) trackFeaturedProjectView(current.id, index % count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured projects"
      className="relative mb-10 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-6 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-zinc-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        <Sparkles className="h-4 w-4" aria-hidden="true" /> Featured Projects
      </h2>
      <div aria-live={paused ? "polite" : "off"} className="flex items-center gap-6 px-10">
        <ProjectImage logoUrl={current.logoUrl} name={current.name} className="!h-20 !w-20 shrink-0" />
        <div className="min-w-0">
          <Link href={`/projects/${current.id}`} className="text-2xl font-bold hover:text-blue-500">
            {current.name}
          </Link>
          <p className="mt-1 line-clamp-2 text-zinc-600 dark:text-zinc-400">{current.description}</p>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Editor&apos;s Pick
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" aria-hidden="true" /> {current.rating}
            </span>
          </div>
        </div>
      </div>
      {count > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous featured project" className="absolute left-3 top-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white dark:bg-zinc-800/80">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next featured project" className="absolute right-3 top-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white dark:bg-zinc-800/80">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="mt-4 flex justify-center gap-2">
            {featured.map((project, i) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${project.name}`}
                aria-current={i === index % count}
                className={`h-2 w-2 rounded-full ${i === index % count ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default FeaturedProjectsCarousel;
