"use client";

import React, { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { FormTimeEstimate } from "@/components/ui/FormTimeEstimate";
import { UPDATE_TYPES, UpdateType, ProjectUpdate } from "@/types/update";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { X } from "lucide-react";
import { updateFormSchema, type UpdateFormData } from "@/lib/schemas/update.schema";

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
  projectId: _projectId,
  initialUpdate,
  onSubmit,
  onCancel,
}: UpdateFormProps) {
  const updateTypeId = useId();
  const versionId = useId();
  const titleId = useId();
  const contentId = useId();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      type: initialUpdate?.type || UPDATE_TYPES.ANNOUNCEMENT,
      title: initialUpdate?.title || "",
      content: initialUpdate?.content || "",
      version: initialUpdate?.version || "",
    },
  });

  const type = watch("type");
  const title = watch("title");
  const content = watch("content");
  const version = watch("version");

  useUnsavedChanges(isDirty, isSubmitting);

  const onFormSubmit = (data: UpdateFormData) => {
    onSubmit({
      type: data.type,
      title: data.title,
      content: data.content,
      version: data.type === UPDATE_TYPES.RELEASE ? data.version : undefined,
    });
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">
          {initialUpdate ? "Edit Update" : "New Update"}
        </h3>
        <button
          type="button"
          onClick={handleCancel}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          aria-label="Close update form"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <FormTimeEstimate
          fieldCount={type === UPDATE_TYPES.RELEASE ? 4 : 3}
          completedFields={
            1 + Number(title.length > 0) + Number(content.length > 0) +
            (type === UPDATE_TYPES.RELEASE ? Number(version && version.length > 0) : 0)
          }
          secondsPerField={40}
        />
        <div>
          <label htmlFor={updateTypeId} className="block text-sm font-medium mb-2">
            Update Type
          </label>
          <select
            id={updateTypeId}
            {...register("type")}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {Object.values(UPDATE_TYPES).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
          )}
        </div>

        {type === UPDATE_TYPES.RELEASE && (
          <div>
            <label htmlFor={versionId} className="block text-sm font-medium mb-2">
              Version <span className="text-red-500">*</span>
            </label>
            <input
              id={versionId}
              type="text"
              {...register("version")}
              placeholder="e.g., v1.2.0"
              className={`w-full bg-white dark:bg-zinc-900 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.version
                  ? "border-red-500"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            />
            {errors.version && (
              <p className="text-red-500 text-sm mt-1">{errors.version.message}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor={titleId} className="block text-sm font-medium mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id={titleId}
            type="text"
            {...register("title")}
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
              <p className="text-red-500 text-sm">{errors.title.message}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-zinc-400">{title.length}/100</p>
          </div>
        </div>

        <div>
          <label htmlFor={contentId} className="block text-sm font-medium mb-2">
            Content <span className="text-red-500">*</span>
          </label>
          <textarea
            id={contentId}
            {...register("content")}
            placeholder="Describe your update in detail..."
            rows={6}
            className={`w-full bg-white dark:bg-zinc-900 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${
              errors.content
                ? "border-red-500"
                : "border-zinc-200 dark:border-zinc-700"
            }`}
          />
          {errors.content && (
            <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" className="flex-1" disabled={isSubmitting}>
            {initialUpdate ? "Update" : "Publish"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
