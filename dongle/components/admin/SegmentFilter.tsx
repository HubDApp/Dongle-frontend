"use client";

import React from "react";
import type { SubmissionSegment } from "@/services/form-segmentation";
import { Filter, X } from "lucide-react";

interface SegmentFilterProps {
  segments: SubmissionSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string | null) => void;
}

export default function SegmentFilter({
  segments,
  selectedSegmentId,
  onSelectSegment,
}: SegmentFilterProps) {
  const activeSegment = segments.find((s) => s.id === selectedSegmentId);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
        <Filter className="w-3.5 h-3.5" />
        <span>Segment:</span>
      </div>

      <button
        type="button"
        onClick={() => onSelectSegment(null)}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
          !selectedSegmentId
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
        }`}
      >
        All Submissions
      </button>

      {segments.map((segment) => {
        const isSelected = selectedSegmentId === segment.id;

        return (
          <button
            key={segment.id}
            type="button"
            onClick={() => onSelectSegment(isSelected ? null : segment.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isSelected
                ? `${segment.badgeBg} ${segment.badgeText} ring-2 ring-current shadow-sm`
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            {segment.name}
            {isSelected && <X className="w-3 h-3 ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}
