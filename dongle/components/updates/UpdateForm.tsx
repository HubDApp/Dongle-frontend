"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { UPDATE_TYPES, UpdateType, ProjectUpdate } from "@/types/update";
import { X } from "lucide-react";

interface UpdateFormProps {
  projectId: string;
  initialUpdate?: ProjectUpdate;
  onSubmit: (data: {
    type: UpdateType;
    title: string;
    content: string;
    version?: string;
  }) => void;
  onCancel: () => void;
}

export default function UpdateForm({
  projectId,
  initialUpdate,
  onSubmit,
  onCancel,
}: UpdateFormProps) {
  const [type, setType] = useState<UpdateType>(
    initialUpdate?.type || UPDATE_TYPES.ANNOUNCEMENT
  );
  const [title, setTitle] = useState(initialUpdate?.title || "");
  const [content, setContent] = useState(initialUpdate?.content || "");
  const [version, setVersion] = useState(initialUpdate?.version || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > 100) {
      newErrors.title = "Title must be 100 characters or less";
    }

    if (!content.trim()) {
      newErrors.content = "Content is required";
    } else if (content.length < 20) {
      newErrors.content = "Content must be at least 20 characters";
    }

    if (type === UPDATE_TYPES.RELEASE && !version.trim()) {
      newErrors.version = "Version is required for releases";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        type,
        title: title.trim(),
        content: content.trim(),
        version: type === UPDATE_TYPES.RELEASE ? version.trim() : undefined,
      });
    }
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">
          {initialUpdate ? "Edit Update" : "New Update"}
        </h3>
        <button
          onClick={onCancel}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Update Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as UpdateType)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {Object.values(UPDATE_TYPES).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {type === UPDATE_TYPES.RELEASE && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Version <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g., v1.2.0"
              className={`w-full bg-white dark:bg-zinc-900 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.version
                  ? "border-red-500"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            />
            {errors.version && (
              <p className="text-red-500 text-sm mt-1">{errors.version}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief title for your update"
            maxLength={100}
            className={`w-full bg-white dark:bg-zinc-900 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              errors.title
                ? "border-red-500"
                : "border-zinc-200 dark:border-zinc-700"
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.title ? (
              <p className="text-red-500 text-sm">{errors.title}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-zinc-400">{title.length}/100</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Content <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe your update in detail..."
            rows={6}
            className={`w-full bg-white dark:bg-zinc-900 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${
              errors.content
                ? "border-red-500"
                : "border-zinc-200 dark:border-zinc-700"
            }`}
          />
          {errors.content && (
            <p className="text-red-500 text-sm mt-1">{errors.content}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" className="flex-1">
            {initialUpdate ? "Update" : "Publish"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
