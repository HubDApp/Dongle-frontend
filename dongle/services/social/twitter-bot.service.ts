/**
 * Twitter bot service for auto-posting project verifications and trending
 * projects. Powers issue #722: Auto-Post Project Verifications and Trending
 * Projects.
 *
 * Acceptance criteria:
 *  - Twitter bot account: @DongleApp
 *  - Auto-tweet on project verification (Gold tier only)
 *  - Auto-tweet on weekly top 3 trending projects
 *  - Auto-tweet on platform milestones
 *  - Tweet template configurable by admin
 *  - Include project logo and link
 *  - Project owners can opt-out
 *  - Manual tweet button in admin panel
 */

export interface TwitterConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessSecret?: string;
  botHandle: string;
  enabled: boolean;
  autoTweetVerification: boolean;
  autoTweetTrending: boolean;
  autoTweetMilestones: boolean;
  tweetTemplateVerification: string;
  tweetTemplateTrending: string;
  tweetTemplateMilestone: string;
}

export interface TweetResult {
  posted: boolean;
  tweetId?: string;
  error?: string;
}

export interface OptOutRecord {
  projectId: string;
  optedOutAt: string;
}

const DEFAULT_CONFIG: TwitterConfig = {
  botHandle: "@DongleApp",
  enabled: false,
  autoTweetVerification: true,
  autoTweetTrending: true,
  autoTweetMilestones: true,
  tweetTemplateVerification:
    "🏆 New Gold-tier verified project on @DongleApp! {projectName} — {description}. Explore: {projectLink} #Stellar #Dongle #Verified",
  tweetTemplateTrending:
    "🔥 Trending this week on @DongleApp! {projectName} is in the top 3. Discover it: {projectLink} #Stellar #Trending",
  tweetTemplateMilestone:
    "🎉 Platform milestone reached: {milestone}. Thanks to our community! #Dongle #Stellar",
};

const optOuts: Map<string, OptOutRecord> = new Map();

/**
 * Read Twitter configuration from environment variables. Keys are never
 * hardcoded. Falls back to disabled when not configured.
 */
export function getTwitterConfig(): TwitterConfig {
  const apiKey = process.env.TWITTER_API_KEY;
  const configured = Boolean(apiKey);

  return {
    ...DEFAULT_CONFIG,
    enabled: configured && process.env.TWITTER_ENABLED !== "false",
    apiKey,
    apiSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  };
}

/**
 * Check whether a project owner has opted out of auto-tweets.
 */
export function isOptedOut(projectId: string): boolean {
  return optOuts.has(projectId);
}

/**
 * Opt a project out of auto-tweets.
 */
export function optOut(projectId: string): void {
  optOuts.set(projectId, { projectId, optedOutAt: new Date().toISOString() });
}

/**
 * Opt a project back in to auto-tweets.
 */
export function optIn(projectId: string): void {
  optOuts.delete(projectId);
}

/**
 * List all opted-out project IDs (admin panel).
 */
export function listOptOuts(): OptOutRecord[] {
  return Array.from(optOuts.values());
}

/**
 * Render a tweet template with project data.
 */
function renderTemplate(template: string, project: { name: string; description?: string; link: string }): string {
  return template
    .replace(/{projectName}/g, project.name)
    .replace(/{description}/g, project.description || "")
    .replace(/{projectLink}/g, project.link)
    .replace(/{botHandle}/g, DEFAULT_CONFIG.botHandle);
}

/**
 * Post a tweet via the Twitter API v2. Falls back gracefully when credentials
 * are missing or the request fails.
 */
export async function postTweet(text: string): Promise<TweetResult> {
  const config = getTwitterConfig();
  if (!config.enabled) {
    return { posted: false, error: "Twitter integration not configured" };
  }

  try {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { posted: false, error: `Twitter ${res.status}: ${body}` };
    }
    const json = await res.json();
    return { posted: true, tweetId: json?.data?.id };
  } catch (error) {
    return { posted: false, error: error instanceof Error ? error.message : "Tweet failed" };
  }
}

/**
 * Auto-tweet when a project is verified (Gold tier only). Respects opt-out.
 */
export async function tweetVerification(project: {
  id: string;
  name: string;
  description?: string;
  link: string;
  tier: string;
}): Promise<TweetResult> {
  const config = getTwitterConfig();
  if (!config.autoTweetVerification) return { posted: false, error: "Auto-tweet verification disabled" };
  if (project.tier !== "Gold") {
    return { posted: false, error: "Only Gold tier verifications are tweeted" };
  }
  if (isOptedOut(project.id)) {
    return { posted: false, error: "Project opted out of auto-tweets" };
  }
  const text = renderTemplate(config.tweetTemplateVerification, {
    name: project.name,
    description: project.description,
    link: project.link,
  });
  return postTweet(`${config.botHandle} ${text}`);
}

/**
 * Auto-tweet the weekly top 3 trending projects.
 */
export async function tweetTrending(projects: Array<{
  id: string;
  name: string;
  description?: string;
  link: string;
  rank: number;
}>): Promise<TweetResult[]> {
  const config = getTwitterConfig();
  if (!config.autoTweetTrending) return [];
  return Promise.all(
    projects
      .filter((p) => p.rank <= 3 && !isOptedOut(p.id))
      .map((p) =>
        postTweet(
          `${config.botHandle} ${renderTemplate(config.tweetTemplateTrending, {
            name: p.name,
            description: p.description,
            link: p.link,
          })} #Rank${p.rank}`,
        ),
      ),
  );
}

/**
 * Auto-tweet a platform milestone.
 */
export async function tweetMilestone(milestone: string): Promise<TweetResult> {
  const config = getTwitterConfig();
  if (!config.autoTweetMilestones) return { posted: false, error: "Auto-tweet milestones disabled" };
  const text = config.tweetTemplateMilestone.replace("{milestone}", milestone);
  return postTweet(`${config.botHandle} ${text}`);
}

/**
 * Manual tweet endpoint helper used by the admin panel.
 */
export async function manualTweet(text: string): Promise<TweetResult> {
  return postTweet(text);
}
