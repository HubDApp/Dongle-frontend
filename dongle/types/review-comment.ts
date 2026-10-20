/**
 * ReviewComment types — Issue #654
 *
 * Threaded discussion comments attached to reviews.
 * Maximum nesting depth is 3 (root → reply → reply-to-reply).
 */

export const MAX_COMMENT_DEPTH = 3;
export const COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface ReviewComment {
  id: string;
  reviewId: string;
  authorAddress: string;
  /** null for root-level comments; set to parent comment's id for replies */
  parentId: string | null;
  /** Depth of nesting: 0 = root, 1 = reply, 2 = reply-to-reply, max 3 */
  depth: number;
  /** DOMPurify-sanitized markdown content */
  body: string;
  createdAt: string;
  updatedAt: string;
  /** True when a moderator or the author has soft-deleted this comment */
  deleted: boolean;
  /** Populated replies (built client-side or server-side when depth < MAX) */
  replies?: ReviewComment[];
}

export interface ReviewCommentInput {
  body: string;
  /** Provide when replying to a specific comment */
  parentId?: string | null;
  authorAddress: string;
}

export interface ReviewCommentsResponse {
  comments: ReviewComment[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
