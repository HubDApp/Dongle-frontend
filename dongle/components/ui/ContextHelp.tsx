"use client";

import { useEffect, useId, useRef, useState } from "react";
import { readPreference, rememberPreference } from "@/lib/ui-preferences";

export default function ContextHelp({ tip, label, children, href }: {
  tip: string; label: string; children: React.ReactNode; href?: string;
}) {
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore optional browser preferences after hydration.
  useEffect(() => { setIntro(!readPreference("dongle-help").includes(tip)); }, [tip]);
  const viewed = () => { rememberPreference("dongle-help", tip); setIntro(false); };
  return <span ref={root} className="relative inline-flex items-center gap-1 text-sm font-normal"
    onMouseLeave={() => { if (!root.current?.contains(document.activeElement)) setOpen(false); }}
    onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
    onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } }}>
    <button type="button" aria-label={`Help about ${label}`} aria-expanded={open} aria-describedby={open ? id : undefined}
      onMouseEnter={() => { setOpen(true); viewed(); }} onFocus={() => { setOpen(true); viewed(); }} onClick={() => { setOpen(true); viewed(); }}
      className="rounded-full border px-1.5 text-blue-600">?</button>
    {intro && <span className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-800 px-1">
      <button type="button" onClick={() => { setOpen(true); viewed(); }}>What&apos;s this?</button>
      <button type="button" aria-label={`Dismiss introduction to ${label}`} onClick={viewed}>×</button>
    </span>}
    {open && <span id={id} role="note" className="fixed inset-x-4 bottom-4 z-40 rounded-xl border bg-white p-4 text-zinc-800 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:top-full sm:w-64 dark:bg-zinc-900 dark:text-zinc-100">
      {children}<button type="button" aria-label={`Close help about ${label}`} className="block underline mt-2" onClick={() => setOpen(false)}>Close</button>{href && <a href={href} className="block mt-2 underline">Read documentation</a>}
    </span>}
  </span>;
}
