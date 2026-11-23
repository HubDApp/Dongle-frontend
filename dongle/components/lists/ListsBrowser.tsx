"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useWallet } from "@/context/wallet.context";
import { curatedListService } from "@/services/curated-lists/curated-list.service";
import { projectService } from "@/services/project/project.service";
import type { CuratedProjectList } from "@/types/curated-list";

export default function ListsBrowser() {
  const { publicKey } = useWallet();
  const [lists, setLists] = useState<CuratedProjectList[]>([]);
  const [loading, setLoading] = useState(true);
  const followedLists = lists.filter((list) => publicKey && list.followers.includes(publicKey));

  useEffect(() => {
    let cancelled = false;
    void curatedListService.getLists(publicKey).then((result) => {
      if (!cancelled) setLists(result);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [publicKey]);

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">Community curation</p>
          <h1 className="mt-2 text-3xl font-bold">Project Lists</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Explore collections selected by the Stellar community.</p>
        </div>
        <Link href="/lists/new" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:opacity-90 dark:bg-white dark:text-zinc-900"><Plus className="h-4 w-4" />Create a list</Link>
      </header>

      {loading ? <p className="py-10 text-sm text-zinc-500">Loading lists...</p> : lists.length === 0 ? (
        <div className="border-y border-zinc-200 py-14 text-center dark:border-zinc-800">
          <h2 className="text-lg font-semibold">No lists yet</h2>
          <p className="mt-2 text-sm text-zinc-500">Start a collection and share your project discoveries.</p>
          <Link href="/lists/new" className="mt-4 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-400">Create the first list</Link>
        </div>
      ) : (
        <>
        {followedLists.length > 0 ? (
          <section aria-labelledby="following-lists-heading" className="mb-10">
            <h2 id="following-lists-heading" className="mb-2 text-lg font-semibold">Following</h2>
            <p className="mb-3 text-sm text-zinc-500">Lists you follow, ordered by their latest update.</p>
            <div className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {[...followedLists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((list) => (
                <Link key={list.id} href={`/lists/${list.id}`} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
                  <span className="font-medium hover:underline">{list.title}</span>
                  <span className="text-xs text-zinc-500">Updated {new Date(list.updatedAt).toLocaleDateString()} · {list.projectIds.length} projects</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <h2 className="mb-3 text-lg font-semibold">{publicKey ? "Browse all lists" : "Community lists"}</h2>
        <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {lists.filter((list) => list.visibility === "public" || list.ownerAddress === publicKey).map((list) => {
            const projectNames = list.projectIds.slice(0, 3).map((id) => projectService.getProjectById(id)?.name).filter(Boolean);
            return (
              <article key={list.id} className="flex min-h-56 flex-col border-t border-zinc-200 py-5 dark:border-zinc-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">{list.visibility}</span>
                  <span className="text-xs text-zinc-500">{list.followers.length} followers</span>
                </div>
                <Link href={`/lists/${list.id}`} className="text-lg font-semibold hover:underline">{list.title}</Link>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-zinc-500 dark:text-zinc-400">{list.description || "A curated collection of Stellar projects."}</p>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span className="line-clamp-1">{projectNames.join(" · ")}{list.projectIds.length > 3 ? ` · +${list.projectIds.length - 3}` : ""}</span>
                  <span className="shrink-0">{list.projectIds.length} projects</span>
                </div>
              </article>
            );
          })}
        </div>
        </>
      )}
    </main>
  );
}