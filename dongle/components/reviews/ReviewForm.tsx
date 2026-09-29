"use client";

import React, { useId, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Review, REVIEW_CONSTRAINTS } from "@/types/review";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { X, Star } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { reviewFormSchema, type ReviewFormData } from "@/lib/schemas/review.schema";
import {
  FormAnnouncerProvider,
  useFormAnnouncer,
} from "@/components/ui/FormAnnouncer";
import { FormErrorSummary } from "@/components/ui/FormErrorSummary";

interface ReviewFormProps {
  projectId: string;
  projectName: string;
  userAddress: string;
  initialReview?: Review;
  dailyReviewCount?: number;
  requiresCaptcha?: boolean;
  onSubmit: (
    review: Omit<
      Review,
      "id" | "createdAt" | "userAddress" | "projectId" | "projectName"
    > & { captchaToken?: string },
  ) => void;
  onCancel: () => void;
}

// Inner component that uses the announcer hook.
function ReviewFormInner({
  projectName,
  initialReview,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const ratingLabelId = useId();
  const ratingGroupId = useId();
  const { announce, announceError } = useFormAnnouncer();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty, isSubmitting, isSubmitSuccessful },
    reset,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: initialReview?.rating || 5,
      comment: initialReview?.comment || "",
    },
    mode: "onBlur",
  });

  useUnsavedChanges(isDirty, isSubmitting);

  const rating = watch("rating");
  const comment = watch("comment");

  // Announce validation errors when they appear.
  useEffect(() => {
    const messages: string[] = [];
    if (errors.rating?.message) messages.push(`Rating: ${errors.rating.message}`);
    if (errors.comment?.message) messages.push(`Comment: ${errors.comment.message}`);
    if (messages.length > 0) {
      announceError(messages.join(". "));
    }
  }, [errors.rating, errors.comment, announceError]);

  // Announce submitting state.
  useEffect(() => {
    if (isSubmitting) {
      announce("Submitting your review…");
    }
  }, [isSubmitting, announce]);

  // Announce successful submission.
  useEffect(() => {
    if (isSubmitSuccessful) {
      announce(
        initialReview ? "Review updated successfully." : "Review posted successfully.",
      );
    }
  }, [isSubmitSuccessful, initialReview, announce]);

  const onSubmitForm = async (data: ReviewFormData) => {
    onSubmit(data);
  };

  return (
    <ErrorBoundary
      operation="Review form"
      userAction={initialReview ? "updating a review" : "posting a review"}
      onReset={() => {
        reset();
      }}
    >
      <form
        onSubmit={handleSubmit(onSubmitForm)}
        className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl"
        noValidate
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">
              {initialReview ? "Edit Review" : "Add Review"}
            </h3>
            <p className="text-sm text-zinc-500">{projectName}</p>
          </div>
          <IconButton
            type="button"
            onClick={onCancel}
            aria-label="Close form"
            variant="ghost"
            size="sm"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        {/* Error summary — shown at the top whenever validation fails */}
        <FormErrorSummary
          errors={[
            ...(errors.rating?.message
              ? [{ fieldId: ratingGroupId, label: "Rating", message: errors.rating.message }]
              : []),
            ...(errors.comment?.message
              ? [{ fieldId: `${ratingGroupId}-comment`, label: "Comment", message: errors.comment.message }]
              : []),
          ]}
        />

        <div className="space-y-4">
          <div>
            <label id={ratingLabelId} className="block text-sm font-medium mb-2">
              Rating
              {errors.rating && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div role="radiogroup" aria-labelledby={ratingLabelId} className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  id={`${ratingGroupId}-${star}`}
                  {...register("rating", { valueAsNumber: true })}
                  onClick={() => {
                    const input = document.querySelector(
                      `input[name="rating"][value="${star}"]`,
                    ) as HTMLInputElement;
                    if (input) input.checked = true;
                  }}
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  aria-checked={rating === star}
                  aria-pressed={rating === star}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    rating >= star
                      ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  }`}
                  onMouseDown={() => {
                    const hiddenInput = document.createElement("input");
                    hiddenInput.type = "hidden";
                    hiddenInput.name = "rating";
                    hiddenInput.value = String(star);
                  }}
                >
                  <Star className="w-5 h-5 fill-current" />
                </button>
              ))}
            </div>
            <input
              type="hidden"
              {...register("rating", { valueAsNumber: true })}
            />
            {errors.rating && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-2">
                {errors.rating.message}
              </p>
            )}
          </div>

          <div>
            <TextAreaField
              label="Comment"
              required
              {...register("comment")}
              maxLength={REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH}
              placeholder="Share your experience with this project..."
              error={errors.comment?.message}
              className="h-32"
            />
            <div className="flex justify-between items-start mt-2 text-xs text-zinc-500">
              <span>Min: {REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH} characters</span>
              {comment.length > 0 &&
                comment.trim().length < REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH && (
                  <span className="text-amber-500 dark:text-amber-400 font-medium">
                    {REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH - comment.trim().length} more
                    character(s) required
                  </span>
                )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isSubmitting
              ? "Submitting..."
              : initialReview
                ? "Update Review"
                : "Post Review"}
          </button>
        </div>
      </form>
    </ErrorBoundary>
  );
}

// Public export — wraps the inner form with FormAnnouncerProvider so it is
// self-contained.  If a parent already provides FormAnnouncerContext the inner
// hook will pick that up instead of the nested one (React always uses the
// nearest provider), so there is no duplication.
export default function ReviewForm(props: ReviewFormProps) {
  return (
    <FormAnnouncerProvider>
      <ReviewFormInner {...props} />
    </FormAnnouncerProvider>
  );
}
