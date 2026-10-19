import type { Review } from "@/types/review";

export interface ReviewSearchOptions {
  query: string;
  ratingMin?: number;
  ratingMax?: number;
  dateFrom?: string;
  dateTo?: string;
  verifiedOnly?: boolean;
  language?: string;
  sort?: "relevance" | "date";
  page?: number;
  pageSize?: number;
}

export interface ReviewSearchHit extends Review {
  score: number;
  highlights: Array<{ start: number; end: number }>;
}

export interface ReviewSearchResponse {
  results: ReviewSearchHit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  suggestions: string[];
}

function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && (word.endsWith("es") || word.endsWith("s"))) {
    return word.slice(0, word.endsWith("es") ? -2 : -1);
  }
  return word;
}

function words(text: string): Array<{ value: string; start: number; end: number }> {
  return Array.from(text.matchAll(/[\p{L}\p{N}]+/gu), (match) => ({
    value: match[0].toLocaleLowerCase(),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + Number(left[row - 1] !== right[column - 1]),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function matchScore(queryWord: string, commentWord: string): number {
  if (queryWord === commentWord) return 3;
  if (stem(queryWord) === stem(commentWord)) return 2;
  if (commentWord.startsWith(queryWord) || queryWord.startsWith(commentWord)) return 1;
  const distance = editDistance(queryWord, commentWord);
  return distance <= (queryWord.length > 6 ? 2 : 1) ? 1 / (distance + 1) : 0;
}

function matchesDate(createdAt: string, from?: string, to?: string): boolean {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  if (from && timestamp < new Date(from).getTime()) return false;
  if (to) {
    const end = new Date(to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) end.setUTCHours(23, 59, 59, 999);
    if (timestamp > end.getTime()) return false;
  }
  return true;
}

export function searchReviews(
  reviews: Review[],
  options: ReviewSearchOptions,
): ReviewSearchResponse {
  const queryWords = words(options.query).map(({ value }) => value);
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 20)));
  const page = Math.max(1, Math.floor(options.page ?? 1));
  if (queryWords.length === 0) {
    return { results: [], total: 0, page, pageSize, totalPages: 0, suggestions: [] };
  }

  const scored = reviews.flatMap((review) => {
    if (options.ratingMin !== undefined && review.rating < options.ratingMin) return [];
    if (options.ratingMax !== undefined && review.rating > options.ratingMax) return [];
    if (options.dateFrom || options.dateTo) {
      if (!matchesDate(review.createdAt, options.dateFrom, options.dateTo)) return [];
    }
    if (options.verifiedOnly && review.isVerifiedReviewer !== true) return [];
    if (
      options.language &&
      review.language?.toLocaleLowerCase().split("-")[0] !== options.language.toLocaleLowerCase().split("-")[0]
    ) return [];

    const commentWords = words(review.comment);
    const matchedWords: typeof commentWords = [];
    let score = 0;
    for (const queryWord of queryWords) {
      let bestScore = 0;
      let bestWord: (typeof commentWords)[number] | undefined;
      for (const commentWord of commentWords) {
        const currentScore = matchScore(queryWord, commentWord.value);
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestWord = commentWord;
        }
      }
      if (!bestWord) return [];
      score += bestScore;
      matchedWords.push(bestWord);
    }

    return [{
      ...review,
      score,
      highlights: matchedWords.map(({ start, end }) => ({ start, end })),
    }];
  });

  scored.sort((left, right) =>
    options.sort === "date"
      ? new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      : right.score - left.score || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  const suggestions = Array.from(new Set(
    scored.flatMap((hit) => words(hit.comment).map(({ value }) => value))
      .filter((word) => word.startsWith(queryWords[queryWords.length - 1]) && !queryWords.includes(word)),
  )).slice(0, 5);
  const total = scored.length;
  const totalPages = Math.ceil(total / pageSize);

  return {
    results: scored.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    totalPages,
    suggestions,
  };
}