"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { projectService } from "@/services/project/project.service";
import { Project } from "@/types/project";
import { useTheme } from "@/providers/ThemeProvider";
import { fuzzyMatch } from "@/lib/utils";
import { readPreference, rememberPreference } from "@/lib/ui-preferences";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";

type Command = { id: string; label: string; group: "Projects" | "Navigate" | "Actions"; href?: string };
const commands: Command[] = [
  ...[["Discover projects", "/discover"], ["Reviews", "/reviews"], ["Verification", "/verify"], ["Analytics", "/analytics"]].map(([label, href]) => ({ id: href, label, href, group: "Navigate" as const })),
  ...[["New project", "/projects/new"], ["Compare projects", "/compare"], ["View bookmarks", "/profile"]].map(([label, href]) => ({ id: href, label, href, group: "Actions" as const })),
  { id: "theme", label: "Toggle theme", group: "Actions" },
];

export default function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const dismiss = useCallback(() => {
    if (query.trim()) rememberPreference("dongle-command-search", query.trim());
    setOpen(false);
  }, [query]);
  const openPalette = useCallback(() => {
    setRecent(readPreference("dongle-command-recent"));
    setHistory(readPreference("dongle-command-search"));
    setQuery("");
    setSelected(0);
    try {
      // Match Discover's catalogue, including its moderation visibility rules.
      setProjects(projectService.getDiscoverableProjects());
      setLoadError(false);
    } catch {
      setProjects([]);
      setLoadError(true);
    }
    setOpen(true);
  }, []);
  useModalFocusTrap(open, dialog, input, dismiss);
  useScrollLock(open);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // This documented global shortcut intentionally also works in text inputs.
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k" && !event.isComposing) {
        if (document.querySelector('[aria-modal="true"]') && !dialog.current) return;
        event.preventDefault();
        if (event.repeat) return;
        if (dialog.current) dismiss();
        else openPalette();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dismiss, openPalette]);
  const results = useMemo(() => {
    const all: Command[] = [...commands, ...projects.map(project => ({ id: `project-${project.id}`, label: project.name, href: `/projects/${encodeURIComponent(project.id)}`, group: "Projects" as const }))];
    const groups = ["Projects", "Navigate", "Actions"];
    return all.filter(command => fuzzyMatch(command.label, query, 0.7)).sort((a, b) => {
      if (!query.trim()) {
        const rank = (id: string) => recent.includes(id) ? recent.indexOf(id) : 100;
        if (rank(a.id) !== rank(b.id)) return rank(a.id) - rank(b.id);
      }
      return groups.indexOf(a.group) - groups.indexOf(b.group);
    });
  }, [projects, query, recent]);
  const activeIndex = Math.min(selected, Math.max(0, results.length - 1));
  useEffect(() => { dialog.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" }); }, [activeIndex, query]);
  const execute = (command: Command) => {
    setRecent(rememberPreference("dongle-command-recent", command.id));
    if (query.trim()) setHistory(rememberPreference("dongle-command-search", query.trim()));
    setOpen(false);
    if (command.href) router.push(command.href);
    else setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };
  return <>
    <button type="button" onClick={event => { event.currentTarget.focus(); openPalette(); }} aria-keyshortcuts="Meta+K Control+K" className="fixed bottom-5 left-5 z-40 rounded-full border bg-white px-4 py-2 text-sm shadow dark:bg-zinc-900">Quick actions <kbd>Ctrl / ⌘ K</kbd></button>
    {open && <div className="fixed inset-0 z-[100] bg-black/60 p-3 pt-[10vh]" onClick={e => { if (e.target === e.currentTarget) dismiss(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Quick actions" tabIndex={-1} className="mx-auto max-w-xl rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-900"
        onKeyDown={e => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setSelected(results.length ? (activeIndex + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length : 0); }
          if (e.key === "Enter" && e.target === input.current && results[activeIndex]) { e.preventDefault(); execute(results[activeIndex]); }
        }}>
        <div className="flex gap-2"><input ref={input} aria-label="Search projects, pages and actions" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="command-results" aria-activedescendant={results.length ? `command-${activeIndex}` : undefined} value={query} onChange={e => { setQuery(e.target.value); setSelected(0); }} className="w-full rounded border bg-transparent p-3" placeholder="Search projects, pages and actions…" />
          <button type="button" onClick={dismiss} aria-label="Close quick actions">×</button></div>
        {!query && history.length > 0 && <div className="flex flex-wrap gap-2 py-2" aria-label="Recent searches">{history.slice(0, 3).map(value => <button type="button" key={value} onClick={() => { setQuery(value); setSelected(0); }} className="rounded border px-2 text-sm">{value}</button>)}</div>}
        {!query && recent.length > 0 && <p className="text-xs mt-2">Recently used first</p>}
        {loadError && <p role="status" className="text-sm">Project search is unavailable. Navigation and actions are still available.</p>}
        <div id="command-results" role="listbox" aria-label="Commands" className="mt-3 max-h-[55vh] overflow-y-auto">
          {results.map((command, index) => {
            const start = command.label.toLowerCase().indexOf(query.trim().toLowerCase());
            return <div key={command.id}>
              {(index === 0 || results[index - 1].group !== command.group) && <div className="px-3 pt-3 text-xs font-bold text-zinc-500">{command.group}</div>}
              <div role="option" id={`command-${index}`} aria-selected={activeIndex === index} onMouseMove={() => setSelected(index)} onClick={() => execute(command)} className={`cursor-pointer rounded-lg p-3 ${activeIndex === index ? "bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-100" : ""}`}>
                {query.trim() && start >= 0 ? <>{command.label.slice(0, start)}<mark>{command.label.slice(start, start + query.trim().length)}</mark>{command.label.slice(start + query.trim().length)}</> : command.label}
              </div>
            </div>;
          })}
          {!results.length && <p className="p-6 text-center" role="status">No matching commands. Try a project name or “theme”.</p>}
        </div>
      </div>
    </div>}
  </>;
}
