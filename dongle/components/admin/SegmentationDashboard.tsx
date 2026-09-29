"use client";

import React, { useState, useEffect } from "react";
import {
  getAllSegments,
  computeSegmentStats,
  deleteCustomSegment,
  type SubmissionSegment,
  type SegmentStats,
} from "@/services/form-segmentation";
import type { ProjectSubmission } from "@/types/project";
import {
  Filter,
  Plus,
  Trash2,
  TrendingUp,
  Tag,
  CheckCircle2,
  Layers,
  Sparkles,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import CustomSegmentModal from "./CustomSegmentModal";

interface SegmentationDashboardProps {
  submissions: ProjectSubmission[];
  selectedSegmentId?: string | null;
  onSelectSegment?: (segmentId: string | null) => void;
}

export default function SegmentationDashboard({
  submissions,
  selectedSegmentId,
  onSelectSegment,
}: SegmentationDashboardProps) {
  const [segments, setSegments] = useState<SubmissionSegment[]>([]);
  const [stats, setStats] = useState<SegmentStats[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<SubmissionSegment | null>(null);

  const refreshSegments = () => {
    const all = getAllSegments();
    setSegments(all);
    setStats(computeSegmentStats(submissions, all));
  };

  useEffect(() => {
    refreshSegments();
  }, [submissions]);

  const handleDelete = (segmentId: string, segmentName: string) => {
    if (window.confirm(`Are you sure you want to delete custom segment "${segmentName}"?`)) {
      deleteCustomSegment(segmentId);
      toast.success(`Segment "${segmentName}" deleted`);
      refreshSegments();
      if (selectedSegmentId === segmentId) {
        onSelectSegment?.(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-500" />
            Automatic Submission Segments
          </h3>
          <p className="text-xs text-zinc-500">
            Rules auto-segment submissions based on category, quality, contracts, and risk.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSegment(null);
            setModalOpen(true);
          }}
          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Custom Segment
        </button>
      </div>

      {/* Segment Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ segment, count, percentage, averageQualityScore }) => {
          const isSelected = selectedSegmentId === segment.id;

          return (
            <div
              key={segment.id}
              onClick={() => onSelectSegment?.(isSelected ? null : segment.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? "border-purple-500 dark:border-purple-400 bg-purple-50/20 dark:bg-purple-950/20 ring-2 ring-purple-500/20 shadow-md"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${segment.badgeBg} ${segment.badgeText}`}
                >
                  {segment.name}
                </span>

                <div className="flex items-center gap-1">
                  {segment.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(segment.id, segment.name);
                      }}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-600 rounded-md transition-colors"
                      title="Delete custom segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-xl font-bold">{count}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-500 line-clamp-2 mb-4">
                {segment.description}
              </p>

              {/* Progress and Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Share of submissions</span>
                  <span className="font-bold">{percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                  <span>Avg. Quality Score</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    {averageQualityScore}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <CustomSegmentModal
          isOpen={modalOpen}
          initialSegment={editingSegment}
          submissions={submissions}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            refreshSegments();
          }}
        />
      )}
    </div>
  );
}
