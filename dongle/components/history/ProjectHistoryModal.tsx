"use client";

import React, { useState } from "react";
import { ProjectVersion } from "@/types/history";
import { formatDistanceToNow } from "date-fns";
import { Clock, History, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ProjectHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ProjectVersion[];
  onRestore: (version: ProjectVersion) => void;
}

export function ProjectHistoryModal({
  isOpen,
  onClose,
  history,
  onRestore,
}: ProjectHistoryModalProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedVersion = history.find((v) => v.id === selectedVersionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-4xl max-h-[85vh] flex overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-slide-up">
        {/* Sidebar: Timeline */}
        <div className="w-1/3 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Version History</h2>
              <p className="text-xs text-zinc-500">Audit trail of changes</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-8 bottom-8 w-px bg-zinc-200 dark:bg-zinc-800" />
            
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center mt-4 relative z-10">
                No history available.
              </p>
            ) : (
              history.map((version, index) => {
                const isSelected = version.id === selectedVersionId;
                const isLatest = index === 0;
                
                return (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersionId(version.id)}
                    className={`relative z-10 w-full text-left p-4 rounded-xl transition-all ${
                      isSelected 
                        ? "bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 ring-2 ring-blue-500/20" 
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 shrink-0 w-3 h-3 rounded-full border-2 ${
                        isLatest 
                          ? "bg-blue-500 border-blue-200 dark:border-blue-900" 
                          : "bg-zinc-400 border-white dark:border-zinc-950"
                      }`} />
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono truncate max-w-[150px]">
                          by {version.updatedBy.slice(0, 4)}...{version.updatedBy.slice(-4)}
                        </p>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-2 uppercase tracking-wide">
                          {version.action}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content: Diff Viewer */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              {selectedVersion ? "Version Details" : "Select a version"}
            </h3>
            <div className="flex items-center gap-3">
              {selectedVersion && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onRestore(selectedVersion)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore This Version
                </Button>
              )}
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!selectedVersion ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <History className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a version from the timeline to view changes</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">
                    Changes in this version
                  </h4>
                  {selectedVersion.changes.length === 0 ? (
                    <p className="text-sm text-zinc-500 italic">No fields were changed.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedVersion.changes.map((change, idx) => (
                        <div key={idx} className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">
                            {change.field}
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                              <p className="text-[10px] uppercase font-bold text-red-500 mb-1">Previous</p>
                              <pre className="text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap font-mono break-all">
                                {change.oldValue === undefined ? "—" : JSON.stringify(change.oldValue, null, 2)}
                              </pre>
                            </div>
                            <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-100 dark:border-green-900/50">
                              <p className="text-[10px] uppercase font-bold text-green-500 mb-1">New</p>
                              <pre className="text-xs text-green-700 dark:text-green-400 whitespace-pre-wrap font-mono break-all">
                                {change.newValue === undefined ? "—" : JSON.stringify(change.newValue, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">
                    Full Snapshot
                  </h4>
                  <div className="bg-zinc-950 rounded-xl p-4 overflow-x-auto border border-zinc-800">
                    <pre className="text-xs text-zinc-300 font-mono">
                      {JSON.stringify(selectedVersion.snapshot, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
