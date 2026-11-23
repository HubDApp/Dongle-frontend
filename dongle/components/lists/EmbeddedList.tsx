"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { curatedListService } from "@/services/curated-lists/curated-list.service";
import { projectService } from "@/services/project/project.service";
import { resolveListProjects } from "@/types/curated-list";

export default function EmbeddedList({ listId }: { listId: string }) {
  const [list, setList] = useState<Awaited<ReturnType<typeof curatedListService.getList>>>(null);
  const projects = useMemo(() => projectService.getAllProjects(), []);

  useEffect(() => {
    void curatedListService.getList(listId).then(setList);
  }, [listId]);

  const listedProjects = useMemo(
    () => list ? resolveListProjects(list, projects) : [],
    [list, projects],
  );

  if (!list) return <main className="p-5 text-sm text-zinc-500">Loading collection...</main>;

  return (
    <main className="mx-auto max-w-2xl border border-zinc-200 bg-white p-5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">Curated project list</p>
          <h1 className="mt-1 text-xl font-bold">{list.title}</h1>
          {list.description ? <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{list.description}</p> : null}
        </div>
        <span className="shrink-0 text-xs text-zinc-500">{listedProjects.length} projects</span>
      </div>
      <ol className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
        {listedProjects.map((project, index) => (
          <li key={project.id} className="flex items-center gap-3 py-3">
            <span className="text-xs tabular-nums text-zinc-400">{index + 1}</span>
            <div className="min-w-0 flex-1"><Link href={`/projects/${project.id}`} target="_blank" rel="noreferrer" className="truncate text-sm font-semibold hover:underline">{project.name}</Link><p className="text-xs text-zinc-500">{project.primaryCategory}</p></div>
            <span className="text-xs tabular-nums text-zinc-500">★ {project.rating.toFixed(1)}</span>
          </li>
        ))}
      </ol>
      <Link href={`/lists/${list.id}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-emerald-700 underline underline-offset-2 dark:text-emerald-400">View full list on Dongle</Link>
    </main>
  );
}