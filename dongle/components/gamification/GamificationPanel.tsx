"use client";

import { useEffect, useState } from "react";
import { Award, Check, Gift, Lock, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  GAMIFICATION_ACHIEVEMENTS,
  GAMIFICATION_CHANGED_EVENT,
  GAMIFICATION_REWARDS,
  getGamificationProfile,
  redeemReward,
  type GamificationProfile,
} from "@/services/gamification/gamification.service";

interface GamificationPanelProps {
  walletAddress: string | null;
  completionPercent?: number;
  qualityScore?: number;
}

export function GamificationPanel({
  walletAddress,
  completionPercent,
  qualityScore = 0,
}: GamificationPanelProps) {
  const [profile, setProfile] = useState<GamificationProfile>(() =>
    getGamificationProfile(walletAddress),
  );
  const isFormPreview = completionPercent !== undefined;

  useEffect(() => {
    const refresh = (event?: Event) => {
      if (event instanceof CustomEvent && event.detail?.walletAddress !== walletAddress) return;
      setProfile(getGamificationProfile(walletAddress));
    };

    refresh();
    window.addEventListener(GAMIFICATION_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(GAMIFICATION_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [walletAddress]);

  const projectedPoints = 25 + Math.round(Math.min(100, Math.max(0, qualityScore)) / 2);

  if (isFormPreview) {
    return (
      <section
        aria-label="Submission rewards progress"
        className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/70 dark:bg-amber-950/20"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Submission rewards</h3>
          </div>
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {profile.points} points earned
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">
            {completionPercent}% complete · up to {projectedPoints} points for this listing
          </span>
          <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-100">
            {profile.achievementIds.length}/{GAMIFICATION_ACHIEVEMENTS.length} badges
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-zinc-800"
          role="progressbar"
          aria-label="Project form completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionPercent}
        >
          <div
            className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Earn 25 points for submitting, plus up to 50 for listing quality. Complete listings unlock badges.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Contributions
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {profile.submissions.length} project submissions · {profile.points} points available
          </p>
        </div>
        <Award className="h-8 w-8 text-amber-500" aria-hidden="true" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Achievements</h3>
          <ul className="space-y-2">
            {GAMIFICATION_ACHIEVEMENTS.map((achievement) => {
              const unlocked = profile.achievementIds.includes(achievement.id);
              return (
                <li
                  key={achievement.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  {unlocked ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Unlocked" />
                  ) : (
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-label="Locked" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{achievement.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{achievement.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <Gift className="h-4 w-4 text-rose-500" aria-hidden="true" />
            Profile rewards
          </h3>
          <ul className="space-y-2">
            {GAMIFICATION_REWARDS.map((reward) => {
              const redeemed = profile.rewardIds.includes(reward.id);
              const affordable = profile.points >= reward.cost;
              return (
                <li
                  key={reward.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{reward.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{reward.description}</p>
                    <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {reward.cost} points
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={redeemed ? "secondary" : "outline"}
                    disabled={!walletAddress || !affordable || redeemed}
                    onClick={() => {
                      const updated = redeemReward(walletAddress, reward.id);
                      if (updated) setProfile(updated);
                    }}
                  >
                    {redeemed ? "Claimed" : "Redeem"}
                  </Button>
                </li>
              );
            })}
          </ul>
          {profile.rewardIds.length > 0 && (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Claimed titles are stored with this wallet and remain on your profile.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}