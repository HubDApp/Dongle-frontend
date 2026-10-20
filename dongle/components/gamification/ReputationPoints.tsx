"use client";

/**
 * ReputationPoints — review reputation system (#683).
 *
 * Tracks and displays points earned for helpful votes, featured reviews,
 * and first reviews on new projects. Includes leaderboard, badges, and
 * admin-adjustable point values.
 */

import { useState, useEffect } from "react";
import { Trophy, Star, ThumbsUp, Sparkles, Award, TrendingUp } from "lucide-react";

// ── Point values (admin-adjustable) ──────────────────────────────────────────

export const REPUTATION_POINTS = {
  HELPFUL_VOTE: 1,
  FEATURED_REVIEW: 10,
  FIRST_REVIEW_ON_NEW_PROJECT: 5,
} as const;

export interface ReputationProfile {
  address: string;
  points: number;
  badges: string[];
  helpfulVotesReceived: number;
  featuredCount: number;
  firstReviewsCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  points: number;
  badges: string[];
}

// ── Badge thresholds ─────────────────────────────────────────────────────────

export const REPUTATION_BADGES = [
  { id: "reviewer", name: "Reviewer", threshold: 10, icon: "📝" },
  { id: "contributor", name: "Contributor", threshold: 50, icon: "⭐" },
  { id: "expert", name: "Expert", threshold: 100, icon: "🏆" },
  { id: "champion", name: "Champion", threshold: 500, icon: "👑" },
] as const;

function getBadgeForPoints(points: number): string[] {
  return REPUTATION_BADGES.filter((b) => points >= b.threshold).map((b) => b.id);
}

// ── localStorage-backed reputation store ─────────────────────────────────────

const STORAGE_KEY = "dongle:reputation";

function loadReputation(): Record<string, ReputationProfile> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveReputation(data: Record<string, ReputationProfile>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable
  }
}

export function getReputationProfile(address: string): ReputationProfile {
  const data = loadReputation();
  return data[address] ?? {
    address,
    points: 0,
    badges: [],
    helpfulVotesReceived: 0,
    featuredCount: 0,
    firstReviewsCount: 0,
  };
}

export function awardPoints(
  address: string,
  type: keyof typeof REPUTATION_POINTS,
): ReputationProfile | null {
  const data = loadReputation();
  const profile = data[address] ?? {
    address,
    points: 0,
    badges: [],
    helpfulVotesReceived: 0,
    featuredCount: 0,
    firstReviewsCount: 0,
  };

  profile.points += REPUTATION_POINTS[type];
  if (type === "HELPFUL_VOTE") profile.helpfulVotesReceived += 1;
  if (type === "FEATURED_REVIEW") profile.featuredCount += 1;
  if (type === "FIRST_REVIEW_ON_NEW_PROJECT") profile.firstReviewsCount += 1;
  profile.badges = getBadgeForPoints(profile.points);

  data[address] = profile;
  saveReputation(data);
  return profile;
}

export function getLeaderboard(limit = 20): LeaderboardEntry[] {
  const data = loadReputation();
  return Object.values(data)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map((p, i) => ({ rank: i + 1, address: p.address, points: p.points, badges: p.badges }));
}

// ── React Components ─────────────────────────────────────────────────────────

export function ReputationBadge({ badges }: { badges: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badgeId) => {
        const badge = REPUTATION_BADGES.find((b) => b.id === badgeId);
        return badge ? (
          <span
            key={badgeId}
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
          >
            <span aria-hidden="true">{badge.icon}</span>
            {badge.name}
          </span>
        ) : null;
      })}
    </div>
  );
}

export function ReputationDisplay({ address }: { address: string }) {
  const [profile, setProfile] = useState<ReputationProfile | null>(null);

  useEffect(() => {
    setProfile(getReputationProfile(address));
  }, [address]);

  if (!profile) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        <Trophy className="w-4 h-4 text-amber-500" aria-hidden="true" />
        <span>{profile.points} pts</span>
      </div>
      <ReputationBadge badges={profile.badges} />
    </div>
  );
}

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setEntries(getLeaderboard());
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-amber-500" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Leaderboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Top reviewers by reputation points
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No reputation data yet. Start reviewing to earn points!
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.address} className="flex items-center gap-4 p-4">
              <div className="w-8 text-center font-bold text-zinc-400 dark:text-zinc-500">
                {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {entry.address.substring(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {entry.address.substring(0, 8)}…{entry.address.slice(-4)}
                </div>
                <ReputationBadge badges={entry.badges} />
              </div>
              <div className="text-right">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{entry.points}</div>
                <div className="text-xs text-zinc-500">points</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 p-4 text-sm text-zinc-600 dark:text-zinc-400">
        <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">How to earn points</h2>
        <ul className="space-y-1">
          <li className="flex items-center gap-2"><ThumbsUp className="w-3.5 h-3.5" /> Helpful vote: +{REPUTATION_POINTS.HELPFUL_VOTE} point</li>
          <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Featured review: +{REPUTATION_POINTS.FEATURED_REVIEW} points</li>
          <li className="flex items-center gap-2"><Star className="w-3.5 h-3.5" /> First review on new project: +{REPUTATION_POINTS.FIRST_REVIEW_ON_NEW_PROJECT} points</li>
        </ul>
      </div>
    </div>
  );
}
