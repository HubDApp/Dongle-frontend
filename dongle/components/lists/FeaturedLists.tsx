"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { curatedListService } from "@/services/curated-lists/curated-list.service";
import type { CuratedProjectList } from "@/types/curated-list";

export default function FeaturedLists() {
  const [lists, setLists] = useState<CuratedProjectList[]>([]);

  useEffect(() => {
    void curatedListService.getFeatured().then(setLists);
  }, []);

  if (lists.length === 0) return null;

  return (
    <section className="border-y border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">Community picks</p><h2 className="mt-2 text-2xl font-bold">Featured Lists</h2></div>
          <Link href="/lists" className="flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Browse all<ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
          {lists.map((list) => (
            <article key={list.id} className="border-t border-zinc-200 py-4 dark:border-zinc-800">
              <Link href={`/lists/${list.id}`} className="font-semibold hover:underline">{list.title}</Link>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-zinc-500 dark:text-zinc-400">{list.description || "A community-picked collection."}</p>
              <p className="mt-3 text-xs text-zinc-500">{list.projectIds.length} projects · {list.followers.length} followers</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}