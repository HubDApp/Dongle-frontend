"use client";

import { useCallback, useEffect, useState } from "react";
import { Review, type ReviewSentiment } from "@/types/review";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { formatDate } from "@/lib/date";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { type LocaleCode } from "@/lib/i18n/locales";
import {
  buildCacheKey,
  getCachedReviewTranslation,
  persistReviewTranslation,
  readReviewTranslationCache,
} from "@/lib/review-translation";
import { Star, Pencil, Trash2, ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

interface ReviewListProps {
  reviews: Review[];
  currentUserAddress: string | null;
  onEdit: (review: Review) => void;
  onDelete: (id: string) => void | Promise<void>;
  onVoteHelpful?: (id: string) => void;
  onVoteUnhelpful?: (id: string) => void;
  onReport?: (review: Review) => void;
  isAdmin?: boolean;
  onOverrideSentiment?: (reviewId: string, sentiment: ReviewSentiment) => void;
  emptyMessage?: string;
  emptyTitle?: string;
}

type ReviewTranslationState = {
  translatedText: string;
  detectedLanguage: string;
  targetLocale: LocaleCode;
  showOriginal: boolean;
  loading: boolean;
  error?: string;
};

const LOCALE_NAMES: Record<LocaleCode, string> = {
  en: "English",
  es: "Spanish",
  pt: "Português",
};

function formatDetectedLanguage(language: string): string {
  if (!language || language === "auto") return "detected language";

  const normalized = language.toLowerCase();
  if (normalized === "en") return "English";
  if (normalized === "es") return "Spanish";
  if (normalized === "pt") return "Português";
  return language;
}

export default function ReviewList({
  reviews,
  currentUserAddress,
  onEdit,
  onDelete,
  onVoteHelpful,
  onVoteUnhelpful,
  onReport,
  isAdmin = false,
  onOverrideSentiment,
  emptyMessage,
  emptyTitle,
}: ReviewListProps) {
  const { locale } = useTranslation();
  const [translationState, setTranslationState] = useState<Record<string, ReviewTranslationState>>({});

  useEffect(() => {
    const nextMap: Record<string, ReviewTranslationState> = {};
    for (const entry of readReviewTranslationCache()) {
      if (entry.targetLocale !== locale) continue;
      nextMap[buildCacheKey(entry.reviewId, entry.targetLocale)] = {
        translatedText: entry.translatedText,
        detectedLanguage: entry.detectedLanguage,
        targetLocale: entry.targetLocale,
        showOriginal: false,
        loading: false,
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync cached translations when the selected locale changes
    setTranslationState(nextMap);
  }, [locale]);

  const translateReview = useCallback(
    async (review: Review) => {
      const key = buildCacheKey(review.id, locale);
      const cached = getCachedReviewTranslation(review.id, locale);

      if (cached) {
        setTranslationState((current) => ({
          ...current,
          [key]: {
            translatedText: cached.translatedText,
            detectedLanguage: cached.detectedLanguage,
            targetLocale: locale,
            showOriginal: false,
            loading: false,
          },
        }));
        return;
      }

      setTranslationState((current) => ({
        ...current,
        [key]: {
          translatedText: review.comment,
          detectedLanguage: "auto",
          targetLocale: locale,
          showOriginal: false,
          loading: true,
        },
      }));

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: review.comment,
            targetLocale: locale,
          }),
        });

        const data = (await response.json()) as {
          translatedText?: string;
          detectedLanguage?: string;
          error?: string;
        };

        if (!response.ok || !data.translatedText) {
          throw new Error(data.error ?? "Translation failed");
        }

        const nextState: ReviewTranslationState = {
          translatedText: data.translatedText,
          detectedLanguage: data.detectedLanguage ?? "auto",
          targetLocale: locale,
          showOriginal: false,
          loading: false,
        };

        setTranslationState((current) => ({
          ...current,
          [key]: nextState,
        }));

        persistReviewTranslation({
          reviewId: review.id,
          targetLocale: locale,
          originalText: review.comment,
          translatedText: data.translatedText,
          detectedLanguage: data.detectedLanguage ?? "auto",
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Translation failed";
        setTranslationState((current) => ({
          ...current,
          [key]: {
            translatedText: review.comment,
            detectedLanguage: "auto",
            targetLocale: locale,
            showOriginal: false,
            loading: false,
            error: message,
          },
        }));
      }
    },
    [locale],
  );

  const toggleOriginalView = useCallback((review: Review) => {
    const key = buildCacheKey(review.id, locale);
    setTranslationState((current) => {
      const existing = current[key];
      if (!existing) return current;
      return {
        ...current,
        [key]: {
          ...existing,
          showOriginal: !existing.showOriginal,
        },
      };
    });
  }, [locale]);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 px-4">
        {emptyTitle && <p className="text-base font-bold text-zinc-700 dark:text-zinc-300 mb-1">{emptyTitle}</p>}
        <p className="text-zinc-500">{emptyMessage || "No reviews yet. Be the first to leave one!"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const key = buildCacheKey(review.id, locale);
        const translation = translationState[key];
        const content = translation && !translation.showOriginal ? translation.translatedText : review.comment;
        const languageLabel = LOCALE_NAMES[locale];
        const sentimentPresentation = review.sentiment
          ? {
              positive: { emoji: "😊", label: "Positive" },
              neutral: { emoji: "😐", label: "Neutral" },
              negative: { emoji: "😞", label: "Negative" },
            }[review.sentiment]
          : null;
        const shouldHideSentiment = currentUserAddress === review.userAddress;

        return (
          <div
            key={review.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {review.userAddress.substring(0, 1)}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <AddressDisplay address={review.userAddress} copyable={true} truncated={true} inline={true} />
                    {currentUserAddress === review.userAddress && (
                      <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full uppercase">You</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatDate(review.createdAt, "relative")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-bold text-yellow-700 dark:text-yellow-500">{review.rating}</span>
              </div>
            </div>

            {!shouldHideSentiment && (sentimentPresentation || isAdmin) && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {sentimentPresentation && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    aria-label={`Review sentiment: ${sentimentPresentation.label}`}
                    title={`Review sentiment: ${sentimentPresentation.label}`}
                  >
                    <span aria-hidden="true">{sentimentPresentation.emoji}</span>
                    {sentimentPresentation.label}
                    {review.sentimentSource === "admin" && (
                      <span className="ml-1 text-[10px] font-normal">(admin override)</span>
                    )}
                  </span>
                )}
                {isAdmin && onOverrideSentiment && (
                  <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <span className="sr-only">Override review sentiment</span>
                    <select
                      aria-label={`Override sentiment for review by ${review.userAddress}`}
                      value={review.sentiment ?? ""}
                      onChange={(event) =>
                        onOverrideSentiment(
                          review.id,
                          event.target.value as ReviewSentiment,
                        )
                      }
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <option value="" disabled>Override sentiment…</option>
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                    </select>
                  </label>
                )}
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {!translation ? (
                <button
                  type="button"
                  onClick={() => void translateReview(review)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Translate to {languageLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (translation.showOriginal) {
                      setTranslationState((current) => ({
                        ...current,
                        [key]: { ...translation, showOriginal: false },
                      }));
                      return;
                    }
                    toggleOriginalView(review);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {translation.showOriginal ? `Translate to ${languageLabel}` : "Show original"}
                </button>
              )}

              {translation && !translation.showOriginal && (
                <span className="text-[11px] italic text-zinc-500 dark:text-zinc-400">Translated by Google</span>
              )}

              {translation?.detectedLanguage && !translation.showOriginal && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Detected: {formatDetectedLanguage(translation.detectedLanguage)}
                </span>
              )}

              {translation?.error && !translation.showOriginal && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  Translation unavailable — showing original text
                </span>
              )}
            </div>

            <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              {translation?.loading ? "Translating…" : content}
            </p>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="text-xs font-medium text-blue-500 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded">
                  {review.projectName}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onVoteHelpful?.(review.id)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all border ${
                      review.helpfulVotes?.includes(currentUserAddress || "")
                        ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-500"
                        : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-black dark:bg-zinc-800 dark:border-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
                    }`}
                    aria-label={`Mark as helpful, current count ${review.helpfulVotes?.length || 0}`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{review.helpfulVotes?.length || 0}</span>
                  </button>

                  <button
                    onClick={() => onVoteUnhelpful?.(review.id)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all border ${
                      review.unhelpfulVotes?.includes(currentUserAddress || "")
                        ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-500"
                        : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-black dark:bg-zinc-800 dark:border-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
                    }`}
                    aria-label={`Mark as unhelpful, current count ${review.unhelpfulVotes?.length || 0}`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                    <span>{review.unhelpfulVotes?.length || 0}</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {currentUserAddress === review.userAddress ? (
                  <>
                    <IconButton
                      onClick={() => onEdit(review)}
                      aria-label="Edit review"
                      variant="default"
                      size="sm"
                    >
                      <Pencil className="w-4 h-4" />
                    </IconButton>
                    <IconButton
                      onClick={() => onDelete(review.id)}
                      aria-label="Delete review"
                      variant="error"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </>
                ) : (
                  currentUserAddress && onReport && (
                    <IconButton
                      onClick={() => onReport(review)}
                      aria-label="Report review"
                      variant="ghost"
                      size="sm"
                    >
                      <Flag className="w-4 h-4 text-zinc-400 hover:text-red-500" />
                    </IconButton>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
