/**
 * Review edit history types (#681).
 * Tracks modifications to reviews with timestamps and diffs.
 */

export interface ReviewEditEntry {
  id: string;
  reviewId: string;
  reviewerAddress: string;
  previousComment: string;
  newComment: string;
  editedAt: string;
  editNumber: number;
}

export const MAX_EDITS_PER_REVIEW = 3;

/**
 * Compute a simple word-level diff between two strings.
 * Returns added and removed words.
 */
export function computeDiff(
  oldText: string,
  newText: string,
): { added: string[]; removed: string[] } {
  const oldWords = oldText.split(/\s+/).filter(Boolean);
  const newWords = newText.split(/\s+/).filter(Boolean);
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);

  const added = newWords.filter((w) => !oldSet.has(w));
  const removed = oldWords.filter((w) => !newSet.has(w));

  return { added, removed };
}

/**
 * Format a diff for display with markers.
 */
export function formatDiff(oldText: string, newText: string): string {
  const oldWords = oldText.split(/\s+/).filter(Boolean);
  const newWords = newText.split(/\s+/).filter(Boolean);
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);

  const parts: string[] = [];

  for (const word of newWords) {
    if (!oldSet.has(word)) {
      parts.push(`+${word}+`);
    } else {
      parts.push(word);
    }
  }

  // Show removed words at the end
  for (const word of oldWords) {
    if (!newSet.has(word)) {
      parts.push(`-${word}-`);
    }
  }

  return parts.join(" ");
}
