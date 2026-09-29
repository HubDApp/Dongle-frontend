"use client";

import React, { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Review, REVIEW_CONSTRAINTS } from "@/types/review";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useFormAuditLog } from "@/hooks/useFormAuditLog";
import { X, Star } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { FormTimeEstimate } from "@/components/ui/FormTimeEstimate";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { reviewFormSchema, type ReviewFormData } from "@/lib/schemas/review.schema";
import { useFormConversion } from "@/hooks/useFormConversion";
import { useFormCaptcha } from "@/hooks/useFormCaptcha";
import { FormCaptcha } from "@/components/forms/FormCaptcha";

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

export default function ReviewForm({
  projectId,
  projectName,
  userAddress,
  initialReview,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const ratingLabelId = useId();
  const ratingGroupId = useId();
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const conversion = useFormConversion({
    formId: `review-form-${projectId}`,
    formType: initialReview ? "review-update" : "review-submission",
  });
  const captcha = useFormCaptcha({
    action: "review_submit",
    enabled: requiresCaptcha || dailyReviewCount > 0,
  });

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

  // Issue #521, #522, #523: form analytics
  const analytics = useFormAnalytics({
    formId: "review",
    fieldCount: 2, // rating + comment
    isDirty,
  });

  const rating = watch("rating");
  const comment = watch("comment");

  // Form audit logging — records field changes with a timestamp, the acting
  // review author, and the server-stamped client IP.
  const { trackValues: trackAuditValues, logAction: logAuditAction } = useFormAuditLog({
    formId: "review-form",
    formType: initialReview ? "review-edit" : "review-create",
    actor: userAddress,
  });

  useEffect(() => {
    trackAuditValues({ rating, comment });
  }, [trackAuditValues, rating, comment]);

  const onSubmitForm = async (data: ReviewFormData) => {
    conversion.trackSubmitAttempt();
    setCaptchaError(null);

    let captchaToken: string | undefined;
    if (requiresCaptcha) {
      const result = await captcha.runCaptcha();
      const validation = captcha.validateOnSubmit(result);
      if (!validation.valid) {
        setCaptchaError(validation.message);
        conversion.trackFailure("captcha_failed");
        return;
      }
      captchaToken = result.token ?? undefined;
    }

    try {
      onSubmit({
        ...data,
        captchaToken,
      });
      conversion.trackSuccess({ project_id: projectId });
    } catch {
      conversion.trackFailure("submit_error");
    }
  };

  // Track field-level validation errors on change
  const commentFieldHandlers = analytics.fieldHandlers("comment");

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
        onFocusCapture={() => conversion.trackStart()}
        className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl"
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

        <FormTimeEstimate
          fieldCount={2}
          completedFields={Number(Boolean(rating)) + Number(comment.trim().length > 0)}
          secondsPerField={45}
        />
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
            <div
              role="radiogroup"
              aria-labelledby={ratingLabelId}
              className="flex gap-2"
              onFocus={() => analytics.fieldHandlers("rating").onFocus({} as React.FocusEvent<HTMLInputElement>)}
            >
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
                    // Track field change for rating
                    analytics.fieldHandlers("rating").onChange({
                      target: { value: String(star) },
                    } as React.ChangeEvent<HTMLInputElement>);
                  }}
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  aria-checked={rating === star}
                  aria-pressed={rating === star}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    rating >= star
                      ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  }`}
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
              fieldType="reviewComment"
              {...register("comment")}
              maxLength={REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH}
              error={errors.comment?.message}
              className="h-32"
              onFocus={commentFieldHandlers.onFocus}
              onChange={(e) => {
                commentFieldHandlers.onChange(e);
                // Also run the react-hook-form onChange
                register("comment").onChange(e);
              }}
              onBlur={commentFieldHandlers.onBlur}
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

        {requiresCaptcha && (
          <FormCaptcha
            mode={captcha.mode}
            challenge={captcha.challenge}
            accessibleAnswer={captcha.accessibleAnswer}
            onAnswerChange={captcha.setAccessibleAnswer}
            onUseAccessible={captcha.useAccessibleAlternative}
            onRequestChallenge={captcha.requestChallenge}
            loading={captcha.loading}
            error={captchaError}
          />
        )}

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

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-4">
        <Link href="/privacy-policy" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
          Privacy Policy
        </Link>
      </p>
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
