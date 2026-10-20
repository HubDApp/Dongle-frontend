"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import WalletGate from "@/components/wallet/WalletGate";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { curatedListService } from "@/services/curated-lists/curated-list.service";
import { projectService } from "@/services/project/project.service";
import type { CuratedProjectList, CuratedProjectListInput } from "@/types/curated-list";
import { resolveListProjects } from "@/types/curated-list";

const PROJECTS = projectService.getAllProjects();

export default function ListEditor({ listId }: { listId?: string }) {
  const gate = useWalletPageGate();
  const router = useRouter();
  const [list, setList] = useState<CuratedProjectList | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<CuratedProjectListInput["visibility"]>("public");
  const [editorAddresses, setEditorAddresses] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(listId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwner = Boolean(list && gate.publicKey === list.ownerAddress);

  useEffect(() => {
    if (!listId || !gate.publicKey) return;
    let cancelled = false;
    void curatedListService.getList(listId, gate.publicKey).then((loaded) => {
      if (cancelled) return;
      if (!loaded) {
        setError("List not found or you do not have access to edit it.");
        return;
      }
      setList(loaded);
      setTitle(loaded.title);
      setDescription(loaded.description);
      setVisibility(loaded.visibility);
      setEditorAddresses(loaded.editorAddresses.join(", "));
      setProjectIds(loaded.projectIds);
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load this list.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [listId, gate.publicKey]);

  const selectedProjects = useMemo(() => resolveListProjects({
    id: list?.id ?? "draft",
    title,
    description,
    projectIds,
    visibility,
    ownerAddress: gate.publicKey ?? "",
    editorAddresses: [],
    followers: [],
    comments: [],
    createdAt: "",
    updatedAt: "",
  }, PROJECTS), [list?.id, title, description, projectIds, visibility, gate.publicKey]);

  const availableProjects = PROJECTS.filter((project) =>
    !projectIds.includes(project.id) &&
    `${project.name} ${project.primaryCategory}`.toLowerCase().includes(search.toLowerCase()),
  );

  const moveProject = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= projectIds.length) return;
    setProjectIds((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gate.publicKey) return;
    setSaving(true);
    setError(null);
    const input: CuratedProjectListInput = {
      title,
      description,
      projectIds,
      visibility,
      editorAddresses: isOwner || !list
        ? editorAddresses.split(",").map((address) => address.trim()).filter(Boolean)
        : list.editorAddresses,
    };
    try {
      const saved = listId
        ? await curatedListService.update(listId, gate.publicKey, input)
        : await curatedListService.create(input, gate.publicKey);
      router.push(`/lists/${saved.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this list.");
    } finally {
      setSaving(false);
    }
  };

  if (gate.state !== "ready") {
    return <div className="mx-auto max-w-2xl px-4 py-24"><WalletGate gate={gate} pagePurpose="Connect a wallet to create or edit a curated list." /></div>;
  }

  if (loading) return <main className="container mx-auto max-w-4xl px-4 py-10 text-sm text-zinc-500">Loading list...</main>;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Link href={listId ? `/lists/${listId}` : "/lists"} className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to lists
      </Link>
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">Community curation</p>
        <h1 className="mt-2 text-3xl font-bold">{listId ? "Edit project list" : "Create a project list"}</h1>
      </header>

      {error ? <p role="alert" className="mb-4 text-sm text-red-600">{error}</p> : null}

      <form onSubmit={handleSubmit} className="space-y-7">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
            <span className="font-medium">Title</span>
            <input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900" placeholder="Best DeFi dApps in 2026" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
            <span className="font-medium">Description</span>
            <textarea maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="resize-y rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900" placeholder="What makes these projects worth exploring?" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Visibility</span>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as CuratedProjectListInput["visibility"])} className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
              <option value="public">Public · appears in browse and featured lists</option>
              <option value="unlisted">Unlisted · anyone with the URL can view</option>
              <option value="private">Private · only you and editors can view</option>
            </select>
          </label>
          {(!list || isOwner) ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Collaborative editors</span>
              <input value={editorAddresses} onChange={(event) => setEditorAddresses(event.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900" placeholder="Wallet addresses, separated by commas" />
            </label>
          ) : null}
        </div>

        <section aria-labelledby="selected-projects-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="selected-projects-heading" className="text-lg font-semibold">Projects <span className="text-sm font-normal text-zinc-500">({selectedProjects.length})</span></h2>
              <p className="text-xs text-zinc-500">Drag to reorder, or use the arrow controls.</p>
            </div>
          </div>
          <ol className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {selectedProjects.map((project, index) => (
              <li key={project.id} draggable onDragStart={() => setDraggedId(project.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => {
                if (!draggedId || draggedId === project.id) return;
                setProjectIds((current) => {
                  const from = current.indexOf(draggedId);
                  const to = current.indexOf(project.id);
                  if (from < 0 || to < 0) return current;
                  const next = [...current];
                  next.splice(to, 0, next.splice(from, 1)[0]);
                  return next;
                });
                setDraggedId(null);
              }} className="flex items-center gap-3 py-3">
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-zinc-400" aria-hidden="true" />
                <span className="w-6 text-xs tabular-nums text-zinc-400">{index + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{project.name}</p><p className="text-xs text-zinc-500">{project.primaryCategory}</p></div>
                <button type="button" onClick={() => moveProject(index, -1)} disabled={index === 0} aria-label={`Move ${project.name} up`} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => moveProject(index, 1)} disabled={index === selectedProjects.length - 1} aria-label={`Move ${project.name} down`} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => setProjectIds((current) => current.filter((id) => id !== project.id))} className="px-2 py-1 text-xs text-red-600 hover:underline">Remove</button>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="add-project-heading">
          <h2 id="add-project-heading" className="mb-3 text-lg font-semibold">Add projects</h2>
          <label className="mb-3 block max-w-sm text-sm">
            <span className="sr-only">Search projects</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" placeholder="Find a project" />
          </label>
          <div className="max-h-64 divide-y divide-zinc-100 overflow-y-auto border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {availableProjects.map((project) => (
              <button key={project.id} type="button" onClick={() => setProjectIds((current) => [...current, project.id])} className="flex w-full items-center justify-between gap-4 px-2 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <span><span className="block text-sm font-medium">{project.name}</span><span className="text-xs text-zinc-500">{project.primaryCategory}</span></span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Add</span>
              </button>
            ))}
            {availableProjects.length === 0 ? <p className="py-5 text-sm text-zinc-500">No projects to add.</p> : null}
          </div>
        </section>

        <div className="flex justify-end border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <Button type="submit" disabled={saving || projectIds.length === 0} className="flex items-center gap-2">
            <Save className="h-4 w-4" aria-hidden="true" />{saving ? "Saving..." : listId ? "Save changes" : "Publish list"}
          </Button>
        </div>
      </form>
    </main>
  );
}