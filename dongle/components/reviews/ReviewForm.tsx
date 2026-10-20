"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Review, REVIEW_CONSTRAINTS } from "@/types/review";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useFormAuditLog } from "@/hooks/useFormAuditLog";
import { X, Star, Lock, ShieldAlert } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { FormTimeEstimate } from "@/components/ui/FormTimeEstimate";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { reviewFormSchema, type ReviewFormData } from "@/lib/schemas/review.schema";
import { useFormConversion } from "@/hooks/useFormConversion";
import { useFormCaptcha } from "@/hooks/useFormCaptcha";
import { FormCaptcha } from "@/components/forms/FormCaptcha";
import { FormAnnouncerProvider, useFormAnnouncer } from "@/components/ui/FormAnnouncer";
import { FormErrorSummary } from "@/components/ui/FormErrorSummary";
import { useFormAnalytics } from "@/hooks/useFormAnalytics";
import { useReviewDraft } from "@/hooks/useReviewDraft";
import {
  deriveKeyFromWallet,
  encryptReview,
  wrapKeyForAdmin,
  ENCRYPTED_COMMENT_SENTINEL,
} from "@/lib/review-encryption";

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
  ) => void | Promise<void>;
  onCancel: () => void;
}

function ReviewFormInner({
  projectId,
  projectName,
  userAddress,
  initialReview,
  dailyReviewCount,
  requiresCaptcha,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const ratingLabelId = useId();
  const ratingGroupId = useId();
  const encryptCheckboxId = useId();
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [encryptError, setEncryptError] = useState<string | null>(null);

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
  const encrypt = watch("encrypt");
  const { draft, saveDraft, clearDraft, dismissRecovery } = useReviewDraft(
    projectId,
    userAddress,
    !initialReview,
  );

  useEffect(() => {
    if (!isDirty || initialReview) return;
    const timer = window.setTimeout(() => saveDraft({ rating, comment }), 3000);
    return () => window.clearTimeout(timer);
  }, [comment, initialReview, isDirty, rating, saveDraft]);

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
    setEncryptError(null);

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
      let submissionComment = data.comment;
      let encryptedPayload: string | undefined;
      let adminWrappedKey: string | undefined;

      if (data.encrypt) {
        // Derive key from wallet — this will prompt the user to sign in Freighter.
        const key = await deriveKeyFromWallet(userAddress, projectId);
        encryptedPayload = await encryptReview(data.comment, key);
        // Replace comment with sentinel so the plaintext is never stored.
        submissionComment = ENCRYPTED_COMMENT_SENTINEL;
        // Attempt to wrap key for admin decryption (no-op until master key is configured).
        adminWrappedKey = (await wrapKeyForAdmin(key)) ?? undefined;
      }

      await onSubmit({
        rating: data.rating,
        comment: submissionComment,
        captchaToken,
        ...(data.encrypt && {
          encrypted: true,
          encryptedPayload,
          adminWrappedKey,
        }),
      });
      clearDraft();
      conversion.trackSuccess({ project_id: projectId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      // Surface encryption-specific errors distinctly.
      if (data.encrypt && msg.toLowerCase().includes("sign")) {
        setEncryptError("Wallet signature required to encrypt — please approve the request in Freighter.");
      }
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
          </IconButton>
        </div>

        <FormTimeEstimate
          fieldCount={2}
          completedFields={Number(Boolean(rating)) + Number(comment.trim().length > 0)}
          secondsPerField={45}
        />

        {!initialReview && draft ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
            <p>A saved review draft is available.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="font-medium text-blue-700 hover:underline dark:text-blue-300"
                onClick={() => {
                  reset(draft.data);
                  dismissRecovery();
                }}
              >
                Recover draft
              </button>
              <button
                type="button"
                className="text-zinc-600 hover:underline dark:text-zinc-300"
                onClick={clearDraft}
              >
                Discard draft
              </button>
            </div>
          </div>
        ) : null}

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

        {/* Encryption opt-in (#731) — only available for new reviews */}
        {!initialReview && (
          <div className="space-y-3">
            <label
              htmlFor={encryptCheckboxId}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <div className="relative flex items-center">
                <input
                  id={encryptCheckboxId}
                  type="checkbox"
                  {...register("encrypt")}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 peer-checked:bg-indigo-600 transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Lock className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                Encrypt this review
              </span>
            </label>

            {encrypt && (
              <div
                role="note"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30"
              >
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <div className="space-y-1 text-amber-800 dark:text-amber-300">
                  <p className="font-semibold">Encrypted reviews are not searchable.</p>
                  <p>Your review will be encrypted with a key derived from your wallet. Only you (by reconnecting your wallet) and platform admins can read it. The encrypted content is stored on-chain; if you lose access to this wallet the review cannot be recovered.</p>
                  <p>Submitting will ask Freighter to sign a key-derivation message — no funds are moved.</p>
                </div>
              </div>
            )}

            {encryptError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {encryptError}
              </p>
            )}
          </div>
        )}

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
              ? (encrypt ? "Encrypting & submitting..." : "Submitting...")
              : initialReview
                ? "Update Review"
                : (encrypt ? "Encrypt & Post Review" : "Post Review")}
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
