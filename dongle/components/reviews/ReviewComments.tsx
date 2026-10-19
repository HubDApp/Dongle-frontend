"use client";

/**
 * ReviewComments — Issue #654
 *
 * Threaded discussion comments on a review.
 *
 * Features:
 *  - Comment form below the review
 *  - Nested replies up to depth 3
 *  - Edit within 5 minutes of posting
 *  - Soft-delete (author only)
 *  - "Load more replies" for long threads
 *  - Real-time new-comment notifications via SSE
 *  - Markdown rendering (DOMPurify-sanitised on the server; raw text rendered here)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, CornerDownRight, Pencil, Trash2, Loader2, ChevronDown } from "lucide-react";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ReviewComment } from "@/types/review-comment";
import { MAX_COMMENT_DEPTH, COMMENT_EDIT_WINDOW_MS } from "@/types/review-comment";

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchComments(
  reviewId: string,
  page = 1,
): Promise<{ comments: ReviewComment[]; hasMore: boolean; total: number }> {
  const res = await fetch(`/api/reviews/${reviewId}/comments?page=${page}&pageSize=10`);
  if (!res.ok) throw new Error("Failed to load comments");
  const json = await res.json();
  return json.data;
}

async function postComment(
  reviewId: string,
  body: string,
  authorAddress: string,
  parentId?: string | null,
): Promise<ReviewComment> {
  const res = await fetch(`/api/reviews/${reviewId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, authorAddress, parentId: parentId ?? null }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to post comment");
  return json.data;
}

async function patchComment(
  reviewId: string,
  commentId: string,
  body: string,
  authorAddress: string,
): Promise<ReviewComment> {
  const res = await fetch(`/api/reviews/${reviewId}/comments?commentId=${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, authorAddress }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to update comment");
  return json.data;
}

async function deleteComment(
  reviewId: string,
  commentId: string,
  authorAddress: string,
): Promise<void> {
  await fetch(`/api/reviews/${reviewId}/comments?commentId=${commentId}&authorAddress=${authorAddress}`, {
    method: "DELETE",
  });
}

// ─── Within edit window? ──────────────────────────────────────────────────────

function isEditable(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < COMMENT_EDIT_WINDOW_MS;
}

// ─── CommentForm ──────────────────────────────────────────────────────────────

interface CommentFormProps {
  label?: string;
  initialValue?: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
  submitLabel?: string;
}

function CommentForm({
  label = "Add a comment",
  initialValue = "",
  onSubmit,
  onCancel,
  autoFocus = false,
  submitLabel = "Post",
}: CommentFormProps) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(value.trim());
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={label}
        rows={3}
        maxLength={2000}
        className={cn(
          "w-full px-3 py-2 text-sm rounded-xl resize-none",
          "bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
          "placeholder:text-zinc-400",
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all",
            "bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {submitting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Single comment node ──────────────────────────────────────────────────────

interface CommentNodeProps {
  comment: ReviewComment;
  reviewId: string;
  currentUserAddress: string | null;
  onReplyPosted: (reply: ReviewComment) => void;
  onCommentUpdated: (updated: ReviewComment) => void;
  onCommentDeleted: (id: string) => void;
}

function CommentNode({
  comment,
  reviewId,
  currentUserAddress,
  onReplyPosted,
  onCommentUpdated,
  onCommentDeleted,
}: CommentNodeProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const isOwn = currentUserAddress === comment.authorAddress;
  const canEdit = isOwn && isEditable(comment.createdAt);
  const canReply = !comment.deleted && comment.depth < MAX_COMMENT_DEPTH;

  const INITIAL_REPLIES_SHOWN = 3;
  const replies = comment.replies ?? [];
  const visibleReplies = showAllReplies ? replies : replies.slice(0, INITIAL_REPLIES_SHOWN);
  const hiddenCount = replies.length - visibleReplies.length;

  const handleReply = async (body: string) => {
    if (!currentUserAddress) return;
    const reply = await postComment(reviewId, body, currentUserAddress, comment.id);
    onReplyPosted(reply);
    setIsReplying(false);
  };

  const handleEdit = async (body: string) => {
    if (!currentUserAddress) return;
    const updated = await patchComment(reviewId, comment.id, body, currentUserAddress);
    onCommentUpdated(updated);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!currentUserAddress) return;
    await deleteComment(reviewId, comment.id, currentUserAddress);
    onCommentDeleted(comment.id);
  };

  if (comment.deleted) {
    return (
      <div className={cn("text-xs text-zinc-400 dark:text-zinc-500 italic py-1", comment.depth > 0 && "ml-6")}>
        [comment deleted]
        {visibleReplies.length > 0 && (
          <div className="mt-2 space-y-2">
            {visibleReplies.map((r) => (
              <CommentNode
                key={r.id}
                comment={r}
                reviewId={reviewId}
                currentUserAddress={currentUserAddress}
                onReplyPosted={onReplyPosted}
                onCommentUpdated={onCommentUpdated}
                onCommentDeleted={onCommentDeleted}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("group", comment.depth > 0 && "ml-6 border-l-2 border-zinc-100 dark:border-zinc-800 pl-4")}>
      {/* Author + timestamp */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {comment.authorAddress.slice(0, 1).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono truncate max-w-[120px]">
            {comment.authorAddress.slice(0, 6)}…{comment.authorAddress.slice(-4)}
          </span>
          {isOwn && (
            <span className="text-[9px] font-bold uppercase tracking-wide bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
              You
            </span>
          )}
        </div>
        <time
          dateTime={comment.createdAt}
          className="text-[11px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap"
        >
          {formatDate(comment.createdAt, "relative")}
        </time>
      </div>

      {/* Body / edit form */}
      {isEditing ? (
        <CommentForm
          initialValue={comment.body}
          onSubmit={handleEdit}
          onCancel={() => setIsEditing(false)}
          submitLabel="Save"
          autoFocus
        />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
          {comment.body}
        </p>
      )}

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {canReply && currentUserAddress && (
            <button
              type="button"
              onClick={() => setIsReplying((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-blue-500 transition-colors"
            >
              <CornerDownRight className="w-3 h-3" />
              Reply
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
          {isOwn && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      )}

      {/* Inline reply form */}
      {isReplying && (
        <div className="mt-3">
          <CommentForm
            label="Write a reply…"
            onSubmit={handleReply}
            onCancel={() => setIsReplying(false)}
            submitLabel="Reply"
            autoFocus
          />
        </div>
      )}

      {/* Nested replies */}
      {visibleReplies.length > 0 && (
        <div className="mt-3 space-y-3">
          {visibleReplies.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              reviewId={reviewId}
              currentUserAddress={currentUserAddress}
              onReplyPosted={onReplyPosted}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllReplies(true)}
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 transition-colors"
            >
              <ChevronDown className="w-3 h-3" />
              Load {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ReviewCommentsProps {
  reviewId: string;
  /** Currently connected wallet address — null means read-only */
  currentUserAddress: string | null;
  className?: string;
}

export function ReviewComments({ reviewId, currentUserAddress, className }: ReviewCommentsProps) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ── Initial load ──
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchComments(reviewId, 1)
      .then(({ comments: c, hasMore: hm, total: t }) => {
        if (cancelled) return;
        setComments(c);
        setHasMore(hm);
        setTotal(t);
        setPage(1);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  // ── SSE — real-time notifications ──
  useEffect(() => {
    if (!isExpanded) return;

    const es = new EventSource(`/api/reviews/${reviewId}/comments/stream`);
    eventSourceRef.current = es;

    es.addEventListener("comment", (event) => {
      try {
        const newComment: ReviewComment = JSON.parse(event.data);
        setComments((prev) => {
          // Append new root comment or nested reply
          if (!newComment.parentId) {
            return [newComment, ...prev];
          }
          // Append reply into the tree
          return insertReply(prev, newComment);
        });
        setTotal((t) => t + 1);
      } catch {
        // malformed event — ignore
      }
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [reviewId, isExpanded]);

  // ── Helpers ──

  function insertReply(
    nodes: ReviewComment[],
    reply: ReviewComment,
  ): ReviewComment[] {
    return nodes.map((n) => {
      if (n.id === reply.parentId) {
        return { ...n, replies: [...(n.replies ?? []), reply] };
      }
      if (n.replies?.length) {
        return { ...n, replies: insertReply(n.replies, reply) };
      }
      return n;
    });
  }

  function removeFromTree(nodes: ReviewComment[], id: string): ReviewComment[] {
    return nodes.map((n) => {
      if (n.id === id) return { ...n, deleted: true };
      if (n.replies?.length) return { ...n, replies: removeFromTree(n.replies, id) };
      return n;
    });
  }

  function updateInTree(
    nodes: ReviewComment[],
    updated: ReviewComment,
  ): ReviewComment[] {
    return nodes.map((n) => {
      if (n.id === updated.id) return { ...n, ...updated };
      if (n.replies?.length) return { ...n, replies: updateInTree(n.replies, updated) };
      return n;
    });
  }

  const handleRootComment = useCallback(
    async (body: string) => {
      if (!currentUserAddress) return;
      const comment = await postComment(reviewId, body, currentUserAddress, null);
      setComments((prev) => [comment, ...prev]);
      setTotal((t) => t + 1);
    },
    [reviewId, currentUserAddress],
  );

  const handleReplyPosted = useCallback((reply: ReviewComment) => {
    setComments((prev) => insertReply(prev, reply));
    setTotal((t) => t + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommentUpdated = useCallback((updated: ReviewComment) => {
    setComments((prev) => updateInTree(prev, updated));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommentDeleted = useCallback((id: string) => {
    setComments((prev) => removeFromTree(prev, id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { comments: more, hasMore: hm } = await fetchComments(reviewId, nextPage);
      setComments((prev) => [...prev, ...more]);
      setHasMore(hm);
      setPage(nextPage);
    } catch {
      // silently fail for pagination
    } finally {
      setIsLoadingMore(false);
    }
  };

  // ── Render ──

  const toggleLabel = isExpanded
    ? "Hide discussion"
    : `${total > 0 ? `${total} ` : ""}${total === 1 ? "comment" : "comments"}`;

  return (
    <div className={cn("mt-4", className)}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        aria-expanded={isExpanded}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        {toggleLabel}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-4">
          {/* Comment form for authenticated users */}
          {currentUserAddress ? (
            <CommentForm
              label="Join the discussion…"
              onSubmit={handleRootComment}
              submitLabel="Comment"
            />
          ) : (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Connect your wallet to join the discussion.
            </p>
          )}

          {/* Comment list */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          ) : error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">
              No comments yet. Be the first to start a discussion.
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentNode
                  key={comment.id}
                  comment={comment}
                  reviewId={reviewId}
                  currentUserAddress={currentUserAddress}
                  onReplyPosted={handleReplyPosted}
                  onCommentUpdated={handleCommentUpdated}
                  onCommentDeleted={handleCommentDeleted}
                />
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  Load more replies
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
