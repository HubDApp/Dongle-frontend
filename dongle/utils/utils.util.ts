import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createElement, type ReactNode } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[bLen][aLen];
}

export function fuzzyMatch(target: string, query: string, threshold = 0.3): boolean {
  const t = target.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  if (!q) return true;
  if (t.includes(q)) return true;

  const qWords = q.split(/\s+/).filter(Boolean);
  const tWords = t.split(/\s+/).filter(Boolean);

  const allWordsMatch = qWords.every((qw) =>
    tWords.some((tw) => {
      if (tw.includes(qw) || qw.includes(tw)) return true;
      const maxLen = Math.max(tw.length, qw.length);
      if (maxLen === 0) return false;
      const distance = levenshteinDistance(tw, qw);
      const similarity = 1 - distance / maxLen;
      return similarity >= threshold;
    }),
  );

  if (allWordsMatch) return true;

  const maxLen = Math.max(t.length, q.length);
  if (maxLen === 0) return false;
  const overallDistance = levenshteinDistance(t, q);
  const overallSimilarity = 1 - overallDistance / maxLen;
  return overallSimilarity >= threshold;
}

export function highlightText(text: string, query: string, className = "bg-yellow-200 dark:bg-yellow-700/60 rounded px-0.5"): ReactNode[] {
  if (!query || !text) return [text];

  const q = query.trim().toLowerCase();
  if (!q) return [text];

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [text];

  const pattern = new RegExp(
    tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "gi",
  );

  const segments: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  const re = new RegExp(pattern.source, pattern.flags);
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }
    segments.push(
      createElement("mark", { key: `hl-${match.index}-${match[0]}`, className }, match[0]),
    );
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments.length > 0 ? segments : [text];
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
