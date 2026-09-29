export interface GamificationProfile {
  points: number;
  submissions: Array<{ id: string; qualityScore: number; points: number; createdAt: string }>;
  achievementIds: string[];
  rewardIds: string[];
}

export interface GamificationReward {
  id: string;
  name: string;
  description: string;
  cost: number;
}

export const GAMIFICATION_CHANGED_EVENT = "dongle:gamification-changed";

export const GAMIFICATION_ACHIEVEMENTS = [
  { id: "first-submission", name: "First Contribution", description: "Submit your first project." },
  { id: "quality-champion", name: "Quality Champion", description: "Complete every recommended listing detail." },
  { id: "community-builder", name: "Community Builder", description: "Submit three projects." },
] as const;

export const GAMIFICATION_REWARDS: GamificationReward[] = [
  { id: "contributor-title", name: "Contributor title", description: "Show a Contributor title on your profile.", cost: 100 },
  { id: "showcase-title", name: "Showcase title", description: "Show a Community Showcase title on your profile.", cost: 250 },
];

const STORAGE_PREFIX = "dongle_gamification:";
const EMPTY_PROFILE: GamificationProfile = {
  points: 0,
  submissions: [],
  achievementIds: [],
  rewardIds: [],
};

function getStorageKey(walletAddress: string) {
  return `${STORAGE_PREFIX}${walletAddress}`;
}

export function getGamificationProfile(walletAddress: string | null | undefined): GamificationProfile {
  if (typeof window === "undefined" || !walletAddress) return { ...EMPTY_PROFILE };

  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(getStorageKey(walletAddress)) ?? "null");
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_PROFILE };

    const profile = parsed as Partial<GamificationProfile>;
    return {
      points: typeof profile.points === "number" && profile.points >= 0 ? profile.points : 0,
      submissions: Array.isArray(profile.submissions) ? profile.submissions : [],
      achievementIds: Array.isArray(profile.achievementIds) ? profile.achievementIds : [],
      rewardIds: Array.isArray(profile.rewardIds) ? profile.rewardIds : [],
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

function saveProfile(walletAddress: string, profile: GamificationProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(walletAddress), JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent(GAMIFICATION_CHANGED_EVENT, { detail: { walletAddress } }));
  } catch {
    // Storage may be disabled or full; reward tracking must not block submission.
  }
}

export function awardSubmission(
  walletAddress: string | null | undefined,
  submissionId: string,
  qualityScore: number,
): { profile: GamificationProfile; pointsEarned: number; newAchievementIds: string[] } {
  const profile = getGamificationProfile(walletAddress);
  if (!walletAddress || profile.submissions.some((submission) => submission.id === submissionId)) {
    return { profile, pointsEarned: 0, newAchievementIds: [] };
  }

  const normalizedScore = Number.isFinite(qualityScore)
    ? Math.min(100, Math.max(0, Math.round(qualityScore)))
    : 0;
  const pointsEarned = 25 + Math.round(normalizedScore / 2);
  const submissions = [
    ...profile.submissions,
    { id: submissionId, qualityScore: normalizedScore, points: pointsEarned, createdAt: new Date().toISOString() },
  ];
  const earned = new Set(profile.achievementIds);
  if (submissions.length >= 1) earned.add("first-submission");
  if (normalizedScore === 100) earned.add("quality-champion");
  if (submissions.length >= 3) earned.add("community-builder");
  const achievementIds = [...earned];
  const newAchievementIds = achievementIds.filter((id) => !profile.achievementIds.includes(id));
  const updatedProfile = { ...profile, points: profile.points + pointsEarned, submissions, achievementIds };

  saveProfile(walletAddress, updatedProfile);
  return { profile: updatedProfile, pointsEarned, newAchievementIds };
}

export function redeemReward(
  walletAddress: string | null | undefined,
  rewardId: string,
): GamificationProfile | null {
  if (!walletAddress) return null;

  const reward = GAMIFICATION_REWARDS.find((item) => item.id === rewardId);
  const profile = getGamificationProfile(walletAddress);
  if (!reward || profile.rewardIds.includes(rewardId) || profile.points < reward.cost) return null;

  const updatedProfile = {
    ...profile,
    points: profile.points - reward.cost,
    rewardIds: [...profile.rewardIds, rewardId],
  };
  saveProfile(walletAddress, updatedProfile);
  return updatedProfile;
}