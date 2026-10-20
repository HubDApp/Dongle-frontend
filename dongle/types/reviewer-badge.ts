/**
 * Reviewer badge types and badge logic (#678).
 *
 * Badges incentivize quality reviews by recognizing reviewers with high
 * helpfulness scores, verified identity, early participation, or domain
 * expertise.
 */

export type BadgeType =
  | "top-reviewer"
  | "verified-user"
  | "early-adopter"
  | "domain-expert";

export interface ReviewerBadge {
  type: BadgeType;
  label: string;
  description: string;
  icon: string;
}

export interface ReviewerBadgeCriteria {
  /** Total helpful votes received across all reviews. */
  helpfulVotes: number;
  /** Whether the reviewer has OAuth + wallet linked. */
  isVerified: boolean;
  /** Whether the reviewer's first review was during the beta period. */
  reviewedDuringBeta: boolean;
  /** Map of category → number of reviews in that category. */
  reviewsByCategory: Record<string, number>;
  /** Minimum reviews in one category to qualify as Domain Expert. */
  domainExpertThreshold?: number;
}

export const REVIEWER_BADGES: Record<BadgeType, ReviewerBadge> = {
  "top-reviewer": {
    type: "top-reviewer",
    label: "Top Reviewer",
    description: "Earned 100+ helpful votes on reviews",
    icon: "star",
  },
  "verified-user": {
    type: "verified-user",
    label: "Verified User",
    description: "OAuth and wallet linked",
    icon: "shield-check",
  },
  "early-adopter": {
    type: "early-adopter",
    label: "Early Adopter",
    description: "Reviewed during the beta period",
    icon: "rocket",
  },
  "domain-expert": {
    type: "domain-expert",
    label: "Domain Expert",
    description: "10+ reviews in a single category",
    icon: "award",
  },
};

const DEFAULT_DOMAIN_EXPERT_THRESHOLD = 10;

/**
 * Calculate which badges a reviewer qualifies for based on their criteria.
 * Returns the list of earned badges.
 */
export function calculateReviewerBadges(
  criteria: ReviewerBadgeCriteria,
): ReviewerBadge[] {
  const badges: ReviewerBadge[] = [];

  if (criteria.helpfulVotes >= 100) {
    badges.push(REVIEWER_BADGES["top-reviewer"]);
  }

  if (criteria.isVerified) {
    badges.push(REVIEWER_BADGES["verified-user"]);
  }

  if (criteria.reviewedDuringBeta) {
    badges.push(REVIEWER_BADGES["early-adopter"]);
  }

  const threshold = criteria.domainExpertThreshold ?? DEFAULT_DOMAIN_EXPERT_THRESHOLD;
  const hasDomainExpertise = Object.values(criteria.reviewsByCategory).some(
    (count) => count >= threshold,
  );
  if (hasDomainExpertise) {
    badges.push(REVIEWER_BADGES["domain-expert"]);
  }

  return badges;
}
