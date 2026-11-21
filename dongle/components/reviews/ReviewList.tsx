"use client";

import { useEffect, useMemo, useState } from "react";
import { Review, type ReviewSentiment } from "@/types/review";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { formatDate } from "@/lib/date";
import { getReviewLanguageLabel } from "@/lib/review-language";
import {
  helpfulVoteCount,
  unhelpfulVoteCount,
  helpfulnessScore,
  hasVotedHelpful,
  hasVotedUnhelpful,
} from "@/lib/review-votes";
import { Star, Pencil, Trash2, ThumbsUp, ThumbsDown, Flag, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { reviewAnalyticsService } from "@/services/review/review-analytics.service";
import { getIpfsGatewayUrls } from "@/lib/ipfs-gateway";

interface ReviewListProps {
  reviews: Review[];
  /** Total number of reviews before pagination slicing (for the count display). */
  totalCount?: number;
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

const SENTIMENT_PRESENTATION: Record<
  ReviewSentiment,
  { emoji: string; label: string }
> = {
  positive: { emoji: "😊", label: "Positive" },
  neutral: { emoji: "😐", label: "Neutral" },
  negative: { emoji: "😞", label: "Negative" },
};

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
  const [lightbox, setLightbox] = useState<{ url: string; altText: string } | null>(null);
  const [removedMedia, setRemovedMedia] = useState<string[]>([]);
  const [languageFilter, setLanguageFilter] = useState<string>("all");

  useEffect(() => {
    reviewAnalyticsService.recordViews(reviews.map((review) => review.id));
  }, [reviews]);

  const languageGroups = useMemo(() => {
    const filtered =
      languageFilter === "all"
        ? reviews
        : reviews.filter((review) => (review.language ?? "und") === languageFilter);

    const groups = new Map<string, Review[]>();
    for (const review of filtered) {
      const language = review.language ?? "und";
      const group = groups.get(language) ?? [];
      group.push(review);
      groups.set(language, group);
    }
    return groups;
  }, [reviews, languageFilter]);

  const availableLanguages = useMemo(() => {
    const present = new Set(reviews.map((review) => review.language ?? "und"));
    return [...present];
  }, [reviews]);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 px-4">
        {emptyTitle && (
          <p className="text-base font-bold text-zinc-700 dark:text-zinc-300 mb-1">{emptyTitle}</p>
        )}
        <p className="text-zinc-500">{emptyMessage || "No reviews yet. Be the first to leave one!"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="sr-only">Filter reviews by language</span>
          <select
            aria-label="Filter reviews by language"
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value)}
            className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold"
          >
            <option value="all">All Languages</option>
            {availableLanguages.map((language) => (
              <option key={language} value={language}>
                {getReviewLanguageLabel(language)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {languageGroups.size === 0 ? (
        <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 px-4">
          <p className="text-zinc-500">No reviews match this language filter.</p>
        </div>
      ) : (
        [...languageGroups.entries()].map(([language, groupReviews]) => (
          <section key={language} className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              {getReviewLanguageLabel(language)}
            </h3>
            {groupReviews.map((review) => {
              const sentimentPresentation = review.sentiment
                ? SENTIMENT_PRESENTATION[review.sentiment]
                : null;
              const votedHelpful = hasVotedHelpful(review, currentUserAddress);
              const votedUnhelpful = hasVotedUnhelpful(review, currentUserAddress);
              const helpful = helpfulVoteCount(review);
              const unhelpful = unhelpfulVoteCount(review);
              const net = helpfulnessScore(review);
              const visibleMedia = (review.media ?? []).filter(
                (media) => !removedMedia.includes(`${review.id}:${media.cid}`),
              );

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
                          <AddressDisplay address={review.userAddress} copyable truncated inline />
                          {currentUserAddress === review.userAddress && (
                            <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full uppercase">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatDate(review.createdAt, "relative")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-bold text-yellow-700 dark:text-yellow-500">
                        {review.rating}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{review.comment}</p>
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

                  {visibleMedia.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-3">
                      {visibleMedia.map((media) => {
                        const mediaUrl = getIpfsGatewayUrls(media.url)[0] ?? media.url;
                        return (
                          <div key={media.cid} className="relative">
                            {media.type === "video" ? (
                              <video
                                src={mediaUrl}
                                controls
                                preload="metadata"
                                className="max-h-64 max-w-full rounded-lg"
                                aria-label={media.altText}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setLightbox({ url: mediaUrl, altText: media.altText })}
                                aria-label={`View image: ${media.altText}`}
                              >
                                <img
                                  src={mediaUrl}
                                  alt={media.altText}
                                  className="max-h-64 max-w-full cursor-zoom-in rounded-lg object-contain"
                                />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                aria-label="Remove inappropriate media"
                                title="Remove media"
                                onClick={async () => {
                                  const response = await fetch("/api/reviews", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: review.id, removeMediaCid: media.cid }),
                                  });
                                  if (response.ok) {
                                    setRemovedMedia((current) => [...current, `${review.id}:${media.cid}`]);
                                  }
                                }}
                                className="absolute right-1 top-1 rounded bg-white p-1 text-red-600 shadow hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentUserAddress !== review.userAddress && (sentimentPresentation || isAdmin) && (
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
                              onOverrideSentiment(review.id, event.target.value as ReviewSentiment)
                            }
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                          >
                            <option value="" disabled>
                              Override sentiment…
                            </option>
                            <option value="positive">Positive</option>
                            <option value="neutral">Neutral</option>
                            <option value="negative">Negative</option>
                          </select>
                        </label>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-medium text-blue-500 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded">
                        {review.projectName}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onVoteHelpful?.(review.id)}
                          aria-pressed={votedHelpful}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all border ${
                            votedHelpful
                              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-500"
                              : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-black dark:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
                          }`}
                          aria-label={`Mark as helpful, current count ${helpful}`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{helpful}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onVoteUnhelpful?.(review.id)}
                          aria-pressed={votedUnhelpful}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all border ${
                            votedUnhelpful
                              ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-500"
                              : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-black dark:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
                          }`}
                          aria-label={`Mark as unhelpful, current count ${unhelpful}`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                          <span>{unhelpful}</span>
                        </button>

                        <span
                          className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          title="Net helpfulness score (helpful − unhelpful)"
                          aria-label={`Net helpfulness score ${net}`}
                        >
                          Net {net > 0 ? `+${net}` : net}
                        </span>
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
                        currentUserAddress &&
                        onReport && (
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
          </section>
        ))
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review image"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close image"
            className="absolute right-4 top-4 text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-7 w-7" />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.altText}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}