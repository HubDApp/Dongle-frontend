"use client";

import { useEffect, useState, type RefObject } from "react";

// Matches the grid's Tailwind breakpoints: 1 col, md:2, lg:3.
export function columnsForWidth(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

export interface VirtualRange {
  start: number;
  end: number;
  paddingTop: number;
  paddingBottom: number;
}

export function computeVirtualRange(
  itemCount: number,
  columns: number,
  rowHeight: number,
  scrollOffset: number,
  viewportHeight: number,
  overscanRows: number,
): VirtualRange {
  const totalRows = Math.ceil(itemCount / columns);
  const firstRow = Math.min(
    totalRows,
    Math.max(0, Math.floor(scrollOffset / rowHeight) - overscanRows),
  );
  const lastRow = Math.max(
    firstRow,
    Math.min(totalRows, Math.ceil((scrollOffset + viewportHeight) / rowHeight) + overscanRows),
  );
  return {
    start: firstRow * columns,
    end: Math.min(itemCount, lastRow * columns),
    paddingTop: firstRow * rowHeight,
    paddingBottom: (totalRows - lastRow) * rowHeight,
  };
}

/**
 * Window-scrolled row virtualization for a responsive grid: only rows in the
 * viewport plus `overscanRows` above and below are rendered, with padding
 * standing in for the rest so the scrollbar and page height stay the same.
 */
export function useWindowVirtualRows(
  containerRef: RefObject<HTMLElement | null>,
  itemCount: number,
  rowHeight: number,
  overscanRows = 2,
): VirtualRange {
  const [range, setRange] = useState<VirtualRange>({
    start: 0,
    end: itemCount,
    paddingTop: 0,
    paddingBottom: 0,
  });

  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) {
        setRange({ start: 0, end: itemCount, paddingTop: 0, paddingBottom: 0 });
        return;
      }
      const containerTop = el.getBoundingClientRect().top + window.scrollY;
      const next = computeVirtualRange(
        itemCount,
        columnsForWidth(window.innerWidth),
        rowHeight,
        window.scrollY - containerTop,
        window.innerHeight,
        overscanRows,
      );
      setRange((prev) =>
        prev.start === next.start &&
        prev.end === next.end &&
        prev.paddingTop === next.paddingTop &&
        prev.paddingBottom === next.paddingBottom
          ? prev
          : next,
      );
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [containerRef, itemCount, rowHeight, overscanRows]);

  return range;
}
