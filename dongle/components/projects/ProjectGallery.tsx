"use client";

import { useEffect, useRef, useState } from "react";
import ContextHelp from "@/components/ui/ContextHelp";
import ProjectImage from "./ProjectImage";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";

export default function ProjectGallery({ images, name }: { images: string[]; name: string }) {
  // A collection key remounts the viewer when switching projects or image sets.
  return <Gallery key={JSON.stringify([name, images])} images={images} name={name} />;
}

function Gallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ x: 0, y: 0, distance: 0, zoom: 1, pinched: false });
  const open = index !== null;
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const navigate = (delta: number) => {
    pointers.current.clear();
    setIndex(current => current === null ? null : (current + delta + images.length) % images.length);
    reset();
  };
  useModalFocusTrap(open, dialog, closeButton, () => setIndex(null));
  useScrollLock(open);
  useEffect(() => { if (!open) pointers.current.clear(); }, [open]);
  if (!images.length) return <ProjectImage name={name} className="mb-6" />;
  return <>
    {images.some(src => src.includes("ipfs")) && <p className="mb-2">IPFS images <ContextHelp tip="ipfs" label="IPFS images" href="https://docs.ipfs.tech/concepts/what-is-ipfs/">IPFS identifies files by their content rather than a single server address. Dongle loads these images through gateways and tries another gateway when one fails.</ContextHelp></p>}
    <div className={`mb-6 grid gap-3 ${images.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
      {images.map((src, i) => <button key={`${src}-${i}`} type="button" aria-label={`Open ${name} image ${i + 1}`} onClick={event => { event.currentTarget.focus(); reset(); setIndex(i); }}>
        <ProjectImage logoUrl={src} name={name} alt={`${name} image ${i + 1}`} />
      </button>)}
    </div>
    {open && <div ref={dialog} role="dialog" aria-modal="true" aria-label={`${name} image gallery`} tabIndex={-1} className="fixed inset-0 z-[110] flex flex-col bg-black/95 text-white"
      onKeyDown={e => {
        if ((e.target as HTMLElement).matches("input,textarea,[contenteditable=true]")) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); navigate(e.key === "ArrowLeft" ? -1 : 1); }
      }}>
      <div className="flex shrink-0 items-center justify-between gap-2 p-4">
        <span aria-live="polite">{index + 1} / {images.length}</span>
        <div className="flex flex-wrap gap-3">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(1, value - 0.5))}>−</button>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(4, value + 0.5))}>+</button>
          <button type="button" onClick={reset}>Reset to fit</button>
          <button ref={closeButton} type="button" aria-label="Close gallery" onClick={() => setIndex(null)}>Close ×</button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden" onClick={e => { if (e.target === e.currentTarget) setIndex(null); }}>
        {images.length > 1 && <button type="button" aria-label="Previous image" onClick={() => navigate(-1)} className="absolute left-3 z-20 rounded-full bg-black/70 p-3">←</button>}
        <div className="w-[80vw] max-w-6xl touch-none select-none" style={{ cursor: zoom > 1 ? "grab" : "default" }}
          onDragStart={e => e.preventDefault()}
          onPointerDown={e => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const points = [...pointers.current.values()];
            gesture.current = { x: e.clientX, y: e.clientY, distance: points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0, zoom, pinched: points.length > 1 };
          }}
          onPointerMove={e => {
            const previous = pointers.current.get(e.pointerId);
            if (!previous) return;
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const points = [...pointers.current.values()];
            if (points.length === 2 && gesture.current.distance) {
              const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
              setZoom(Math.max(1, Math.min(4, gesture.current.zoom * distance / gesture.current.distance)));
            } else if (zoom > 1) {
              setPan(value => ({ x: Math.max(-window.innerWidth * zoom / 2, Math.min(window.innerWidth * zoom / 2, value.x + e.clientX - previous.x)), y: Math.max(-window.innerHeight * zoom / 2, Math.min(window.innerHeight * zoom / 2, value.y + e.clientY - previous.y)) }));
            }
          }}
          onPointerUp={e => {
            if (!pointers.current.has(e.pointerId)) return;
            if (zoom === 1 && !gesture.current.pinched && Math.abs(e.clientX - gesture.current.x) > 60 && Math.abs(e.clientX - gesture.current.x) > Math.abs(e.clientY - gesture.current.y)) navigate(e.clientX < gesture.current.x ? 1 : -1);
            pointers.current.delete(e.pointerId);
          }} onPointerCancel={e => pointers.current.delete(e.pointerId)}>
          <div style={{ transform: `translate(${zoom === 1 ? 0 : pan.x}px, ${zoom === 1 ? 0 : pan.y}px) scale(${zoom})` }}>
            <ProjectImage key={images[index]} logoUrl={images[index]} name={name} alt={`${name} image ${index + 1}`} className="!bg-transparent max-h-[70vh]" />
          </div>
        </div>
        {images.length > 1 && <button type="button" aria-label="Next image" onClick={() => navigate(1)} className="absolute right-3 z-20 rounded-full bg-black/70 p-3">→</button>}
      </div>
      {images.length > 1 && <div className="flex shrink-0 gap-2 overflow-x-auto p-4" aria-label="Gallery thumbnails">
        {images.map((src, i) => <button key={`${src}-${i}`} type="button" aria-label={`Show image ${i + 1}`} aria-current={i === index ? "true" : undefined} className={`w-20 shrink-0 rounded border-2 ${i === index ? "border-blue-400" : "border-transparent"}`} onClick={() => { setIndex(i); reset(); }}><ProjectImage logoUrl={src} name={name} alt={`${name} thumbnail ${i + 1}`} /></button>)}
      </div>}
    </div>}
  </>;
}
