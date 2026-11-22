"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { projectService } from "@/services/project/project.service";
import { track } from "@/lib/analytics";
import type { Project } from "@/types/project";

const MIN_RESULTS = 3;
const MAX_RESULTS = 6;

/**
 * Score similarity: same category (+5), each overlapping tag (+2),
 * rating closeness (0–2, full points when within 0.5 stars).
 */
export function scoreSimilarity(base: Project, candidate: Project): number {
  let score = 0;
  if (candidate.primaryCategory === base.primaryCategory) score += 5;
  const baseTags = new Set((base.tags ?? []).map((t) => t.toLowerCase()));
  for (const t of candidate.tags ?? []) if (baseTags.has(t.toLowerCase())) score += 2;
  const diff = Math.abs((candidate.rating ?? 0) - (base.rating ?? 0));
  score += Math.max(0, 2 - Math.max(0, diff - 0.5));
  return score;
}

export function getSimilarProjects(base: Project, pool: Project[], limit = MAX_RESULTS): Project[] {
  return pool
    .filter((p) => p.id !== base.id)
    .map((p) => ({ p, score: scoreSimilarity(base, p) }))
    .filter(({ p, score }) => p.primaryCategory === base.primaryCategory || score >= 4)
    .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
    .slice(0, limit)
    .map(({ p }) => p);
}

export function SimilarProjects({ project }: { project: Project }) {
  const similar = useMemo(
    () => getSimilarProjects(project, projectService.getDiscoverableProjects()),
    [project],
  );

  if (similar.length < MIN_RESULTS) return null;

  const categoryHref = `/discover?categories=${encodeURIComponent(project.primaryCategory)}`;

  return (
    <section aria-labelledby="similar-projects-heading" className="mt-12">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 id="similar-projects-heading" className="text-2xl font-bold">
          Similar Projects
        </h2>
        <Link
          href={categoryHref}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline shrink-0"
        >
          See all in {project.primaryCategory}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      {/* Horizontal snap carousel on mobile, grid on larger screens */}
      <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
        {similar.map((p, index) => (
          <li key={p.id} className="snap-start shrink-0 w-[75%] sm:w-auto">
            <Link
              href={`/projects/${p.id}`}
              onClick={() =>
                track("similar_project_click", {
                  sourceProjectId: project.id,
                  targetProjectId: p.id,
                  position: index,
                })
              }
              className="flex h-full flex-col gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <span className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{p.primaryCategory}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{p.description}</p>
              <span className="mt-auto flex items-center gap-1 text-sm text-zinc-500">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {p.rating.toFixed(1)}
                <span className="text-xs">({p.reviews} reviews)</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SimilarProjects;
