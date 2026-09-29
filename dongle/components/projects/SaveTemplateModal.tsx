"use client";

import React, { useRef, useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { cn } from "@/lib/utils";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => { success: boolean; error?: string };
}

export function SaveTemplateModal({ isOpen, onClose, onSave }: SaveTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  useModalFocusTrap(isOpen, dialogRef, initialFocusRef, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Please enter a template name (at least 2 characters).");
      return;
    }
    const result = onSave(name.trim(), description.trim());
    if (!result.success) {
      setError(result.error || "Failed to save template");
      return;
    }
    setName("");
    setDescription("");
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-template-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-md bg-white dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl",
          "p-8",
        )}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-blue-100 dark:bg-blue-900/30">
          <BookmarkPlus className="w-6 h-6 text-blue-600" aria-hidden="true" />
        </div>

        <h2
          id="save-template-title"
          className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2"
        >
          Save as template
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          Store the current form as a reusable template. You can load it later from the
          template library.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            ref={initialFocusRef}
            label="Template name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            placeholder="e.g. My DeFi listing"
            error={error}
            maxLength={80}
          />
          <TextAreaField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short note about when to use this template"
            maxLength={200}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
