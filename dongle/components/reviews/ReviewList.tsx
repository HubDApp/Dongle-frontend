"use client";

import { useState } from "react";
import { Review, ReviewOwnerResponse, REVIEW_OWNER_RESPONSE_EDIT_WINDOW_MS, REVIEW_OWNER_RESPONSE_MAX_LENGTH } from "@/types/review";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/date";
import { Star, Pencil, Trash2, ThumbsUp, ThumbsDown, Flag, MessageSquareReply } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { projectService } from "@/services/project/project.service";
import { reviewService } from "@/services/review/review.service";
import { toast } from "sonner";

interface ReviewListProps {
  reviews: Review[];
  currentUserAddress: string | null;
  onEdit: (review: Review) => void;
  onDelete: (id: string) => void | Promise<void>;
  onVoteHelpful?: (id: string) => void;
  onVoteUnhelpful?: (id: string) => void;
  onReport?: (review: Review) => void;
  isAdmin?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
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
  emptyMessage,
  emptyTitle
}: ReviewListProps) {
  const [responseFormId, setResponseFormId] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState("");
  const [responseOverrides, setResponseOverrides] = useState<Record<string, ReviewOwnerResponse>>({});
  const [savingResponse, setSavingResponse] = useState(false);

  const submitResponse = async (review: Review) => {
    if (!currentUserAddress) return;
    setSavingResponse(true);
    const existingResponse = responseOverrides[review.id] ?? review.ownerResponse;
    try {
      const saved = existingResponse
        ? await reviewService.updateOwnerResponse(review.id, responseDraft, currentUserAddress)
        : await reviewService.addOwnerResponse(review.id, responseDraft, currentUserAddress);
      if (saved.ownerResponse) {
        setResponseOverrides((current) => ({ ...current, [review.id]: saved.ownerResponse! }));
      }
      setResponseFormId(null);
      setResponseDraft("");
      toast.success(existingResponse ? "Response updated" : "Response posted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save response");
    } finally {
      setSavingResponse(false);
    }
  };

  const moderateResponse = async (review: Review, hidden: boolean) => {
    if (!currentUserAddress || !isAdmin) return;
    try {
      const moderated = await reviewService.moderateOwnerResponse(review.id, hidden, currentUserAddress);
      if (moderated.ownerResponse) {
        setResponseOverrides((current) => ({ ...current, [review.id]: moderated.ownerResponse! }));
      }
      toast.success(hidden ? "Owner response hidden" : "Owner response restored");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not moderate response");
    }
  };

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
      {reviews.map((review) => (
        (() => {
          const ownerAddress = projectService.getProjectById(review.projectId)?.ownerAddress;
          const isProjectOwner = Boolean(currentUserAddress && ownerAddress === currentUserAddress);
          const ownerResponse = responseOverrides[review.id] ?? review.ownerResponse;
          const canEditResponse = Boolean(ownerResponse && isProjectOwner &&
            Date.now() - Date.parse(ownerResponse.createdAt) <= REVIEW_OWNER_RESPONSE_EDIT_WINDOW_MS);
          const visibleToViewer = Boolean(ownerResponse && (!ownerResponse.hiddenByAdmin || isAdmin || isProjectOwner));
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

          <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
            {review.comment}
          </p>

          {ownerResponse && visibleToViewer && (
            <div className="mb-5 border-l-2 border-blue-500 py-1 pl-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Project owner</Badge>
                <span className="text-xs text-zinc-500">{formatDate(ownerResponse.createdAt, "relative")}</span>
                {ownerResponse.hiddenByAdmin && <Badge variant="error">Hidden by admin</Badge>}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{ownerResponse.text}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => void moderateResponse(review, !ownerResponse.hiddenByAdmin)}
                  className="mt-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  {ownerResponse.hiddenByAdmin ? "Restore response" : "Hide response"}
                </button>
              )}
            </div>
          )}

          {isProjectOwner && (!ownerResponse || canEditResponse) && (
            <div className="mb-5">
              {responseFormId === review.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitResponse(review);
                  }}
                  className="space-y-2"
                >
                  <label htmlFor={`owner-response-${review.id}`} className="text-sm font-medium">{ownerResponse ? "Edit your response" : "Respond to this review"}</label>
                  <textarea
                    id={`owner-response-${review.id}`}
                    value={responseDraft}
                    onChange={(event) => setResponseDraft(event.target.value.slice(0, REVIEW_OWNER_RESPONSE_MAX_LENGTH))}
                    maxLength={REVIEW_OWNER_RESPONSE_MAX_LENGTH}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    aria-describedby={`owner-response-count-${review.id}`}
                    required
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span id={`owner-response-count-${review.id}`} className="text-xs text-zinc-500">{responseDraft.length}/{REVIEW_OWNER_RESPONSE_MAX_LENGTH}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setResponseFormId(null)} className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700">Cancel</button>
                      <button type="submit" disabled={savingResponse || !responseDraft.trim()} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{savingResponse ? "Saving..." : "Post response"}</button>
                    </div>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setResponseDraft(ownerResponse?.text ?? "");
                    setResponseFormId(review.id);
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <MessageSquareReply className="h-4 w-4" aria-hidden="true" />
                  {ownerResponse ? "Edit response" : "Respond"}
                </button>
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
        })()
      ))}
    </div>
  );
}
