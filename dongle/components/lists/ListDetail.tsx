"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, GitFork, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/context/wallet.context";
import { curatedListService } from "@/services/curated-lists/curated-list.service";
import { projectService } from "@/services/project/project.service";
import type { CuratedProjectList } from "@/types/curated-list";
import { canEditCuratedList, resolveListProjects } from "@/types/curated-list";

export default function ListDetail({ listId }: { listId: string }) {
  const { publicKey, connectWallet } = useWallet();
  const router = useRouter();
  const [list, setList] = useState<CuratedProjectList | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "embed" | null>(null);
  const projects = useMemo(() => projectService.getAllProjects(), []);
  const listedProjects = useMemo(
    () => list ? resolveListProjects(list, projects) : [],
    [list, projects],
  );
  const canEdit = list ? canEditCuratedList(list, publicKey) : false;

  useEffect(() => {
    let cancelled = false;
    void curatedListService.getList(listId, publicKey).then((result) => {
      if (!cancelled) setList(result);
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load this list.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [listId, publicKey]);

  const copyText = async (value: string, kind: "url" | "embed") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Clipboard access failed. Select and copy the share text manually.");
    }
  };

  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/lists/${listId}`;
  const embedCode = `<iframe src="${shareUrl}/embed" title="${list?.title ?? "Project list"}" width="100%" height="560" loading="lazy"></iframe>`;

  const follow = async () => {
    if (!publicKey) {
      await connectWallet();
      return;
    }
    try {
      setList(await curatedListService.follow(listId, publicKey));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not follow this list.");
    }
  };

  const fork = async () => {
    if (!publicKey) {
      await connectWallet();
      return;
    }
    try {
      const copy = await curatedListService.fork(listId, publicKey);
      router.push(`/lists/${copy.id}/edit`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not fork this list.");
    }
  };

  const postComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!publicKey) {
      await connectWallet();
      return;
    }
    try {
      setList(await curatedListService.comment(listId, publicKey, comment));
      setComment("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not post your comment.");
    }
  };

  if (loading) return <main className="container mx-auto max-w-5xl px-4 py-12 text-sm text-zinc-500">Loading list...</main>;
  if (!list) return (
    <main className="container mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">List not found</h1>
      <p className="mt-2 text-sm text-zinc-500">This list may be private or the link may be invalid.</p>
      <Link href="/lists" className="mt-5 inline-block text-sm underline">Browse public lists</Link>
    </main>
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Link href="/lists" className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><ArrowLeft className="h-4 w-4" /> Browse lists</Link>
      <header className="border-y border-zinc-200 py-7 dark:border-zinc-800">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span className="font-semibold uppercase text-emerald-700 dark:text-emerald-400">{list.visibility}</span>
          <span>·</span><span>{list.projectIds.length} projects</span>
          <span>·</span><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{list.followers.length} followers</span>
        </div>
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold">{list.title}</h1>
            {list.description ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">{list.description}</p> : null}
            <p className="mt-4 text-xs text-zinc-500">Updated {new Date(list.updatedAt).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void follow()} variant={publicKey && list.followers.includes(publicKey) ? "secondary" : "outline"}>
              {publicKey && list.followers.includes(publicKey) ? "Following" : "Follow"}
            </Button>
            <Button onClick={() => void fork()} variant="outline" className="flex items-center gap-2"><GitFork className="h-4 w-4" />Fork</Button>
            {canEdit ? <Link href={`/lists/${list.id}/edit`} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-6 py-3 text-base font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"><Pencil className="h-4 w-4" />Edit</Link> : null}
          </div>
        </div>
      </header>

      {error ? <p role="alert" className="my-4 text-sm text-red-600">{error}</p> : null}

      <section aria-labelledby="list-projects-heading" className="py-7">
        <h2 id="list-projects-heading" className="mb-4 text-xl font-semibold">Projects</h2>
        {listedProjects.length === 0 ? <p className="text-sm text-zinc-500">This list has no available projects.</p> : (
          <ol className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {listedProjects.map((project, index) => (
              <li key={project.id} className="flex items-center gap-4 py-4">
                <span className="w-8 text-right text-sm tabular-nums text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/projects/${project.id}`} className="font-semibold hover:underline">{project.name}</Link>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{project.description}</p>
                  <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{project.primaryCategory}</p>
                </div>
                <Link href={`/projects/${project.id}`} aria-label={`View ${project.name}`} className="rounded p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><ExternalLink className="h-4 w-4" /></Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="share-list-heading" className="grid gap-7 border-y border-zinc-200 py-7 dark:border-zinc-800 md:grid-cols-2">
        <div>
          <h2 id="share-list-heading" className="text-lg font-semibold">Share this list</h2>
          <p className="mt-1 text-sm text-zinc-500">Anyone with this URL can view this list unless it is private.</p>
          <div className="mt-3 flex gap-2">
            <input readOnly value={shareUrl} aria-label="List share URL" className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
            <Button onClick={() => void copyText(shareUrl, "url")} variant="outline" aria-label="Copy share URL"><>{copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</></Button>
          </div>
        </div>
        {list.visibility !== "private" ? (
          <div>
            <h2 className="text-lg font-semibold">Embed list</h2>
            <p className="mt-1 text-sm text-zinc-500">Add this iframe to an external site.</p>
            <textarea readOnly value={embedCode} rows={3} aria-label="Embed code" className="mt-3 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900" />
            <Button onClick={() => void copyText(embedCode, "embed")} variant="outline" className="mt-2 flex items-center gap-2">
              {copied === "embed" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy embed code
            </Button>
          </div>
        ) : <p className="text-sm text-zinc-500">Private lists cannot be embedded.</p>}
      </section>

      <section aria-labelledby="list-comments-heading" className="py-7">
        <h2 id="list-comments-heading" className="text-xl font-semibold">Comments <span className="text-base font-normal text-zinc-500">({list.comments.length})</span></h2>
        <form onSubmit={postComment} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1.5 block font-medium">Add to the discussion</span>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} placeholder="Share a thought about this collection" className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <Button type="submit" disabled={!comment.trim()}>Post comment</Button>
        </form>
        <div className="mt-5 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {list.comments.length === 0 ? <p className="py-5 text-sm text-zinc-500">No comments yet.</p> : list.comments.map((item) => (
            <article key={item.id} className="py-4">
              <div className="flex items-center justify-between gap-3 text-xs text-zinc-500"><span className="truncate font-mono">{item.authorAddress}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time></div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}