"use client";

/**
 * VerificationChecklistModal
 *
 * Shows an interactive requirements checklist before verification submission.
 * Users must check off all items (or skip with warning) before submitting.
 */

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Rocket,
  Shield,
  Github,
  Wallet,
  Phone,
  ArrowRight,
  X,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "deployed",
    label: "Project deployed on mainnet",
    description: "Your project must be live and accessible on mainnet",
    icon: <Rocket className="w-5 h-5" />,
  },
  {
    id: "audit",
    label: "Audit completed (Silver/Gold)",
    description: "Security audit by a recognized firm for Silver or Gold tier",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: "github",
    label: "GitHub repo public",
    description: "Source code must be publicly available for review",
    icon: <Github className="w-5 h-5" />,
  },
  {
    id: "wallet",
    label: "Wallet funded for fee",
    description: "Ensure your wallet has sufficient funds for the verification fee",
    icon: <Wallet className="w-5 h-5" />,
  },
  {
    id: "contact",
    label: "Contact info provided",
    description: "Valid email or contact method for verification follow-up",
    icon: <Phone className="w-5 h-5" />,
  },
];

interface VerificationChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function VerificationChecklistModal({
  isOpen,
  onClose,
  onSubmit,
}: VerificationChecklistModalProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [skipChecklist, setSkipChecklist] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allChecked = checkedItems.size === CHECKLIST_ITEMS.length;
  const canSubmit = allChecked || skipChecklist;

  const handleSkip = () => {
    setShowSkipWarning(true);
  };

  const confirmSkip = () => {
    setSkipChecklist(true);
    setShowSkipWarning(false);
  };

  const handleSubmit = () => {
    onSubmit();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="w-2 h-8 bg-violet-500 rounded-full" />
            Verification Requirements
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Please review the requirements below before submitting your verification request.
          Checking all items helps reduce rejection rates.
        </p>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {checkedItems.size} of {CHECKLIST_ITEMS.length} completed
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-500">
              {Math.round((checkedItems.size / CHECKLIST_ITEMS.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${(checkedItems.size / CHECKLIST_ITEMS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Checklist items */}
        <div className="space-y-3 mb-6">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = checkedItems.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors ${
                  isChecked
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="mt-0.5">
                  {isChecked ? (
                    <CheckCircle2 className="w-5 h-5 text-violet-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isChecked ? "text-violet-500" : "text-zinc-400 dark:text-zinc-500"}`}>
                      {item.icon}
                    </span>
                    <span className={`font-medium ${isChecked ? "text-violet-700 dark:text-violet-300" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {item.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Skip warning */}
        {showSkipWarning && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Skip requirements checklist?
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                Submitting without meeting all requirements significantly increases rejection risk.
                We strongly recommend completing the checklist.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowSkipWarning(false)}
                  className="px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={confirmSkip}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Skip Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!skipChecklist && !showSkipWarning && (
            <button
              onClick={handleSkip}
              className="px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Skip Checklist
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
              canSubmit
                ? "text-white bg-violet-500 hover:bg-violet-600"
                : "text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed"
            }`}
          >
            {allChecked ? "All Requirements Met" : skipChecklist ? "Submit (Checklist Skipped)" : "Complete Checklist to Submit"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
