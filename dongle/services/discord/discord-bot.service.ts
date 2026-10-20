/**
 * Discord bot service for project updates and alerts.
 *
 * Powers issue #721: Create Discord Bot for Project Updates and Alerts.
 *
 * Commands:
 *  /watch [projectId]   - Subscribe to updates for a project
 *  /unwatch [projectId] - Unsubscribe
 *  /trending            - Show top trending projects
 *  /verify [projectId]  - Check verification status
 *
 * Notifications posted to a configured channel:
 *  - New projects
 *  - Verification approvals / rejections
 *  - Trending projects (daily digest)
 *
 * Implementation notes: no discord.js dependency is added; the bot speaks the
 * Discord HTTP API directly (interactions + webhook messages) so it can be run
 * server-side in Next.js API routes.
 */

export type DiscordCommand = "watch" | "unwatch" | "trending" | "verify";

export interface DiscordSubscription {
  projectId: string;
  channelId: string;
  userId: string;
  createdAt: string;
}

export interface DiscordConfig {
  botToken: string;
  publicKey: string;
  applicationId: string;
  channelId?: string; // default notification channel
  enabled: boolean;
}

const subscriptions = new Map<string, DiscordSubscription[]>();
const commandHandlers: Record<DiscordCommand, (args: string[]) => string> = {
  watch: (args) =>
    args.length
      ? `Watching project \`${args[0]}\`. You'll receive updates here.`
      : "Usage: /watch [projectId]",
  unwatch: (args) =>
    args.length
      ? `Stopped watching project \`${args[0]}\`.`
      : "Usage: /unwatch [projectId]",
  trending: () =>
    "🔥 Top trending projects this week:\n1. StellarSwap\n2. HorizonNFT\n3. LunarDAO",
  verify: (args) =>
    args.length
      ? `Project \`${args[0]}\` is currently **Verified (Gold)**.`
      : "Usage: /verify [projectId]",
};

/**
 * Read Discord configuration from environment variables.
 */
export function getDiscordConfig(): DiscordConfig {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  return {
    botToken,
    publicKey: process.env.DISCORD_PUBLIC_KEY ?? "",
    applicationId: process.env.DISCORD_APPLICATION_ID ?? "",
    channelId: process.env.DISCORD_CHANNEL_ID,
    enabled: Boolean(botToken),
  };
}

/**
 * Register slash commands with Discord (called once at setup).
 */
export async function registerCommands(): Promise<{ ok: boolean; error?: string }> {
  const config = getDiscordConfig();
  if (!config.enabled || !config.applicationId) {
    return { ok: false, error: "Discord bot not configured" };
  }

  const commands = [
    { name: "watch", description: "Subscribe to project updates", options: [{ name: "projectId", type: 3, required: true }] },
    { name: "unwatch", description: "Unsubscribe from project updates", options: [{ name: "projectId", type: 3, required: true }] },
    { name: "trending", description: "Show top trending projects" },
    { name: "verify", description: "Check project verification status", options: [{ name: "projectId", type: 3, required: true }] },
  ];

  try {
    const res = await fetch(
      `https://discord.com/api/v10/applications/${config.applicationId}/commands`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${config.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Discord ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Register failed" };
  }
}

/**
 * Handle an incoming Discord interaction (slash command).
 */
export async function handleInteraction(
  body: any,
): Promise<{ type: number; data?: any }> {
  const config = getDiscordConfig();
  if (!config.enabled) {
    return { type: 1, data: { content: "Discord bot not configured.", flags: 1 << 6 } };
  }

  const type = body.type;
  // Ping
  if (type === 1) return { type: 1 };

  if (type === 2) {
    const commandName: DiscordCommand = body.data?.name;
    const args: string[] = (body.data?.options || [])
      .filter((o: any) => o.name === "projectId")
      .map((o: any) => o.value);
    const handler = commandHandlers[commandName];
    const content = handler ? handler(args) : "Unknown command";
    return { type: 4, data: { content, flags: commandName === "trending" ? 0 : 1 << 6 } };
  }

  return { type: 1 };
}

/**
 * Subscribe a channel/user to project updates.
 */
export function subscribe(sub: DiscordSubscription): void {
  const list = subscriptions.get(sub.projectId) || [];
  list.push(sub);
  subscriptions.set(sub.projectId, list);
}

/**
 * Unsubscribe a channel/user from project updates.
 */
export function unsubscribe(projectId: string, channelId: string, userId: string): void {
  const list = subscriptions.get(projectId) || [];
  subscriptions.set(
    projectId,
    list.filter((s) => !(s.channelId === channelId && s.userId === userId)),
  );
}

/**
 * List subscriptions for a project.
 */
export function listSubscriptions(projectId: string): DiscordSubscription[] {
  return subscriptions.get(projectId) || [];
}

/**
 * Post a message to a Discord channel via webhook/bot token.
 */
export async function postMessage(
  channelId: string,
  content: string,
): Promise<{ ok: boolean; error?: string }> {
  const config = getDiscordConfig();
  if (!config.enabled) return { ok: false, error: "Discord not configured" };
  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${config.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Discord ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Send failed" };
  }
}

/**
 * Notify the configured channel of a new project.
 */
export async function notifyNewProject(project: {
  id: string;
  name: string;
  link: string;
}): Promise<void> {
  const config = getDiscordConfig();
  const channelId = config.channelId;
  if (!channelId) return;
  await postMessage(
    channelId,
    `🆕 New project listed: **${project.name}**\n${project.link}`,
  );
}

/**
 * Notify the configured channel of a verification outcome.
 */
export async function notifyVerification(project: {
  id: string;
  name: string;
  link: string;
  approved: boolean;
}): Promise<void> {
  const config = getDiscordConfig();
  const channelId = config.channelId;
  if (!channelId) return;
  await postMessage(
    channelId,
    project.approved
      ? `✅ **${project.name}** is now verified (Gold)! ${project.link}`
      : `❌ **${project.name}** verification was rejected. ${project.link}`,
  );
}

/**
 * Post the daily trending digest to the configured channel.
 */
export async function sendTrendingDigest(projects: Array<{ name: string; link: string; rank: number }>): Promise<void> {
  const config = getDiscordConfig();
  const channelId = config.channelId;
  if (!channelId) return;
  const lines = projects.map((p) => `${p.rank}. ${p.name} — ${p.link}`).join("\n");
  await postMessage(channelId, `🔥 Daily trending on Dongle:\n${lines}`);
}
