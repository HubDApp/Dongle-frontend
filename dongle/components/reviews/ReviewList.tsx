"use client";

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { Star, Pencil, Trash2, ThumbsUp, ThumbsDown, Flag, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { reviewAnalyticsService } from "@/services/review/review-analytics.service";
import { getIpfsGatewayUrls } from "@/lib/ipfs-gateway";
import { getReviewLanguageLabel, REVIEW_LANGUAGES } from "@/lib/review-language";
import { ReviewComments } from "@/components/reviews/ReviewComments";
import { LazyImage } from "@/components/ui/LazyImage";

export interface ReviewListProps {
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
  onClearFilters?: () => void;
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

export function ReviewList({
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
  onClearFilters: _onClearFilters,
}: ReviewListProps) {
  const { locale } = useTranslation();
  const [languageFilter, setLanguageFilter] = useState("all");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [showPreferredFirst, setShowPreferredFirst] = useState(true);
  const [lightbox, setLightbox] = useState<{ url: string; altText: string } | null>(null);
  const [removedMedia, setRemovedMedia] = useState<string[]>([]);
  const [translationState, setTranslationState] = useState<Record<string, ReviewTranslationState>>({});

  useEffect(() => {
    reviewAnalyticsService.recordViews(reviews.map((review) => review.id));
  }, [reviews]);

  useEffect(() => {
    const storedLanguage = typeof localStorage !== "undefined" ? localStorage.getItem("dongle_review_language") : null;
    const browserLanguage = typeof navigator !== "undefined" ? navigator.language.split("-")[0].toLowerCase() : "";
    const language = storedLanguage && storedLanguage in REVIEW_LANGUAGES
      ? storedLanguage
      : browserLanguage in REVIEW_LANGUAGES ? browserLanguage : "";
    setPreferredLanguage(language);
    setShowPreferredFirst(typeof localStorage !== "undefined" ? localStorage.getItem("dongle_reviews_preferred_first") !== "false" : true);
  }, []);

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
        setTranslationState((current) => ({
          ...current,
          [key]: {
            translatedText: review.comment,
            detectedLanguage: "auto",
            targetLocale: locale,
            showOriginal: true,
            loading: false,
            error: error instanceof Error ? error.message : "Translation unavailable",
          },
        }));
      }
    },
    [locale],
  );

  const toggleOriginalView = useCallback(
    (review: Review) => {
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
    },
    [locale],
  );

  // useMemo for filtered/sorted reviews
  const filteredReviews = useMemo(() => {
    return languageFilter === "all"
      ? reviews
      : reviews.filter((review) => (review.language ?? "und") === languageFilter);
  }, [reviews, languageFilter]);

  const groupEntries = useMemo(() => {
    const languageGroups = new Map<string, Review[]>();
    for (const review of filteredReviews) {
      const language = review.language && review.language in REVIEW_LANGUAGES ? review.language : "und";
      const group = languageGroups.get(language) ?? [];
      group.push(review);
      languageGroups.set(language, group);
    }
    return [...languageGroups.entries()].sort(([languageA], [languageB]) => {
      if (showPreferredFirst && preferredLanguage) {
        if (languageA === preferredLanguage) return -1;
        if (languageB === preferredLanguage) return 1;
      }
      return 0;
    });
  }, [filteredReviews, showPreferredFirst, preferredLanguage]);

  const availableLanguages = useMemo(() => {
    return [...new Set(reviews.map((review) => review.language ?? "und"))];
  }, [reviews]);

  // useCallback for event handlers
  const handleLanguageFilterChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguageFilter(event.target.value);
  }, []);

  const handlePreferredFirstToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setShowPreferredFirst(event.target.checked);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("dongle_reviews_preferred_first", String(event.target.checked));
    }
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightbox(null);
  }, []);

  const handleRemoveMedia = useCallback(async (reviewId: string, cid: string) => {
    const response = await fetch("/api/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reviewId, removeMediaCid: cid }),
    });
    if (response.ok) {
      setRemovedMedia((current) => [...current, `${reviewId}:${cid}`]);
    }
  }, []);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 px-4">
        {emptyTitle && <p className="text-base font-bold text-zinc-700 dark:text-zinc-300 mb-1">{emptyTitle}</p>}
        <p className="text-zinc-500">{emptyMessage || "No reviews yet. Be the first to leave one!"}</p>
      </div>
    );
  }

  const languageLabel = LOCALE_NAMES[locale] ?? locale;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          Filter language
          <select
            aria-label="Filter reviews by language"
            value={languageFilter}
            onChange={handleLanguageFilterChange}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="all">All languages</option>
            {availableLanguages.map((language) => (
              <option key={language} value={language}>{getReviewLanguageLabel(language)}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={showPreferredFirst}
            onChange={handlePreferredFirstToggle}
          />
          Show reviews in my language first
        </label>
      </div>

      {groupEntries.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">No reviews in this language.</div>
      ) : groupEntries.map(([language, languageReviews]) => (
        <section key={language} aria-labelledby={`review-language-${language}`} className="space-y-3">
          <h3 id={`review-language-${language}`} className="text-sm font-semibold text-zinc-500">
            {getReviewLanguageLabel(language)} <span className="font-normal">({languageReviews.length})</span>
          </h3>
          {languageReviews.map((review) => {
            const key = buildCacheKey(review.id, locale);
            const translation = translationState[key];
            const content = translation && !translation.showOriginal ? translation.translatedText : review.comment;
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
                        {review.language && (
                          <span
                            title="Language automatically detected from the review text"
                            className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {getReviewLanguageLabel(review.language)}
                          </span>
                        )}
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

                <div className="mb-6">
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {translation?.loading ? "Translating…" : content}
                  </p>
                  <a
                    href="https://github.com/HubDApp/Dongle-frontend/issues/18"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    aria-label="Request an automatic translation (Issue 18)"
                  >
                    Translate
                  </a>
                </div>

                {review.media?.filter((media) => !removedMedia.includes(`${review.id}:${media.cid}`)).length ? (
                  <div className="mb-6 flex flex-wrap gap-3">
                    {review.media.filter((media) => !removedMedia.includes(`${review.id}:${media.cid}`)).map((media) => {
                      const mediaUrl = getIpfsGatewayUrls(media.url)[0] ?? media.url;
                      return (
                        <div key={media.cid} className="relative">
                          {media.type === "video" ? (
                            <video src={mediaUrl} controls preload="metadata" className="max-h-64 max-w-full rounded-lg" aria-label={media.altText} />
                          ) : (
                            <button type="button" onClick={() => setLightbox({ url: mediaUrl, altText: media.altText })} aria-label={`View image: ${media.altText}`}>
                              <LazyImage src={mediaUrl} alt={media.altText} className="max-h-64 max-w-full cursor-zoom-in rounded-lg object-contain" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              aria-label="Remove inappropriate media"
                              title="Remove media"
                              onClick={() => void handleRemoveMedia(review.id, media.cid)}
                              className="absolute right-1 top-1 rounded bg-white p-1 text-red-600 shadow hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-medium text-blue-500 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded">
                      {review.projectName}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onVoteHelpful?.(review.id)}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all border ${review.helpfulVotes?.includes(currentUserAddress || "")
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
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all border ${review.unhelpfulVotes?.includes(currentUserAddress || "")
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

                {/* Threaded discussion — Issue #654 */}
                <ReviewComments
                  reviewId={review.id}
                  currentUserAddress={currentUserAddress}
                />
              </div>
            );
          })}
        </section>
      ))}

      {lightbox && (
        <div role="dialog" aria-modal="true" aria-label="Review image" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={handleCloseLightbox}>
          <button type="button" aria-label="Close image" className="absolute right-4 top-4 text-white" onClick={handleCloseLightbox}>
            <X className="h-7 w-7" />
          </button>
          <LazyImage
            src={lightbox.url}
            alt={lightbox.altText}
            priority={true}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export function areReviewListPropsEqual(
  prevProps: Readonly<ReviewListProps>,
  nextProps: Readonly<ReviewListProps>
): boolean {
  if (prevProps.currentUserAddress !== nextProps.currentUserAddress) return false;
  if (prevProps.isAdmin !== nextProps.isAdmin) return false;
  if (prevProps.emptyMessage !== nextProps.emptyMessage) return false;
  if (prevProps.emptyTitle !== nextProps.emptyTitle) return false;
  if (prevProps.onEdit !== nextProps.onEdit) return false;
  if (prevProps.onDelete !== nextProps.onDelete) return false;
  if (prevProps.onVoteHelpful !== nextProps.onVoteHelpful) return false;
  if (prevProps.onVoteUnhelpful !== nextProps.onVoteUnhelpful) return false;
  if (prevProps.onReport !== nextProps.onReport) return false;
  if (prevProps.onOverrideSentiment !== nextProps.onOverrideSentiment) return false;
  if (prevProps.onClearFilters !== nextProps.onClearFilters) return false;

  if (prevProps.reviews === nextProps.reviews) return true;
  if (prevProps.reviews.length !== nextProps.reviews.length) return false;

  for (let i = 0; i < prevProps.reviews.length; i++) {
    const p = prevProps.reviews[i];
    const n = nextProps.reviews[i];
    if (p === n) continue;
    if (
      p.id !== n.id ||
      p.rating !== n.rating ||
      p.comment !== n.comment ||
      p.createdAt !== n.createdAt ||
      p.userAddress !== n.userAddress ||
      p.projectName !== n.projectName ||
      p.featured !== n.featured ||
      p.sentiment !== n.sentiment ||
      p.sentimentSource !== n.sentimentSource ||
      p.language !== n.language ||
      p.helpfulVotes?.length !== n.helpfulVotes?.length ||
      p.unhelpfulVotes?.length !== n.unhelpfulVotes?.length ||
      p.media?.length !== n.media?.length
    ) {
      return false;
    }
  }

  return true;
}

export default memo(ReviewList, areReviewListPropsEqual);
