import { beforeEach, describe, expect, it } from "vitest";
import {
  awardSubmission,
  getGamificationProfile,
  redeemReward,
} from "@/services/gamification/gamification.service";

describe("gamification service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("awards points and first-submission and quality achievements", () => {
    const result = awardSubmission("GTESTWALLET", "submission-1", 100);

    expect(result.pointsEarned).toBe(75);
    expect(result.newAchievementIds).toEqual(["first-submission", "quality-champion"]);
    expect(result.profile.points).toBe(75);
  });

  it("does not award the same submission twice and unlocks the contributor achievement", () => {
    awardSubmission("GTESTWALLET", "submission-1", 80);
    const duplicate = awardSubmission("GTESTWALLET", "submission-1", 100);
    awardSubmission("GTESTWALLET", "submission-2", 80);
    const third = awardSubmission("GTESTWALLET", "submission-3", 80);

    expect(duplicate.pointsEarned).toBe(0);
    expect(duplicate.profile.points).toBe(65);
    expect(third.newAchievementIds).toContain("community-builder");
    expect(getGamificationProfile("GTESTWALLET").submissions).toHaveLength(3);
  });

  it("redeems each profile reward once and deducts its cost", () => {
    awardSubmission("GTESTWALLET", "submission-1", 100);
    awardSubmission("GTESTWALLET", "submission-2", 100);

    const redeemed = redeemReward("GTESTWALLET", "contributor-title");
    expect(redeemed?.points).toBe(50);
    expect(redeemed?.rewardIds).toEqual(["contributor-title"]);
    expect(redeemReward("GTESTWALLET", "contributor-title")).toBeNull();
    expect(redeemReward("GTESTWALLET", "showcase-title")).toBeNull();
  });
});