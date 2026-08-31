"use client";

import dynamic from "next/dynamic";
import { useLazyLoad } from "@/hooks/useIntersectionObserver";
import type { Project } from "@/types/project";
import type { VerificationStatus } from "./VerificationBadge";

const ProjectCardDynamic = dynamic(
  () => import("./ProjectCard").then((mod) => mod.ProjectCard),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 h-[320px] animate-pulse" />
    ),
  },
);

/**
 * Defers rendering of ProjectCard until it enters the viewport.
 * Shows a placeholder skeleton while off-screen.
 */
export function LazyProjectCard({
  project,
  verificationStatus,
  highlightTerm,
}: LazyProjectCardProps) {
  const { ref, isIntersecting } = useLazyLoad<HTMLDivElement>({
    rootMargin: "200px",
  });

  return (
    <div ref={ref} className="min-h-[320px]">
      {isIntersecting ? (
        <Suspense fallback={null}>
          <ProjectCardDynamic
            project={project}
            verificationStatus={verificationStatus}
            highlightTerm={highlightTerm}
            showCompareCheckbox={false}
          />
        </Suspense>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 h-[320px] animate-pulse" />
      )}
    </div>
  );
}
