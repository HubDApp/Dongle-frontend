import {
  REVIEW_SPAM_MIN_QUALITY_LENGTH,
  REVIEW_VELOCITY_DAILY_LIMIT,
} from "@/constants/limits";

export interface ReviewSpamAssessment {
  flags: string[];
  riskScore: number;
  requiresCaptcha: boolean;
}

const REPEATED_CHAR_PATTERN = /(.)\1{3,}/;
const ALL_CAPS_THRESHOLD = 0.7;

function uppercaseRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return 0;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length;
}

/**
 * Client-side heuristics for low-quality / spam review content.
 * Returns a risk score from 0 (clean) to 100 (high risk).
 */
export function assessReviewSpam(comment: string, dailyReviewCount = 0): ReviewSpamAssessment {
  const flags: string[] = [];
  let score = 0;
  const trimmed = comment.trim();

  if (trimmed.length < REVIEW_SPAM_MIN_QUALITY_LENGTH) {
    flags.push("Comment is too short");
    score += 35;
  }

  if (trimmed.length >= 5 && uppercaseRatio(trimmed) >= ALL_CAPS_THRESHOLD) {
    flags.push("Excessive ALL CAPS");
    score += 25;
  }

  if (REPEATED_CHAR_PATTERN.test(trimmed)) {
    flags.push("Repeated character pattern");
    score += 20;
  }

  const wordCounts = new Map<string, number>();
  for (const word of trimmed.toLowerCase().split(/\s+/).filter(Boolean)) {
    wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
  }
  const maxRepeat = Math.max(0, ...wordCounts.values());
  if (maxRepeat >= 4) {
    flags.push("Repeated words");
    score += 15;
  }

  if (/(.)\1{6,}/.test(trimmed.replace(/\s/g, ""))) {
    flags.push("Spam-like character repetition");
    score += 10;
  }

  const requiresCaptcha = dailyReviewCount >= REVIEW_VELOCITY_DAILY_LIMIT;
  if (requiresCaptcha) {
    flags.push("High review velocity — CAPTCHA required");
    score = Math.max(score, 60);
  }

  return {
    flags,
    riskScore: Math.min(100, score),
    requiresCaptcha,
  };
}

export function countReviewsInLast24Hours(
  reviews: { userAddress: string; createdAt: string }[],
  userAddress: string,
  now = Date.now(),
): number {
  const dayAgo = now - 24 * 60 * 60 * 1000;
  return reviews.filter(
    (r) =>
      r.userAddress === userAddress &&
      new Date(r.createdAt).getTime() >= dayAgo,
  ).length;
}
