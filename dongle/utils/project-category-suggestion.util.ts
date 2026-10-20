import type { Project } from "@/types/project";
import { projectService } from "@/services/project/project.service";

export type CategorySuggestionFeedback = {
  category: string;
  accepted: boolean;
};

export type CategorySuggestion = {
  category: string;
  confidence: number;
  score: number;
  reasons: string[];
};

const CATEGORY_LABELS = [
  "DeFi / DEX",
  "Gaming / NFT",
  "Infrastructure",
  "Payments",
  "DAO",
] as const;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "DeFi / DEX": [
    "defi", "dex", "swap", "trading", "liquidity", "yield", "lending", "staking",
    "amm", "pool", "market", "borrow", "vault", "farming",
  ],
  "Gaming / NFT": [
    "game", "gaming", "nft", "mint", "collectible", "play", "arena", "guild", "strategy",
    "p2e", "marketplace", "avatar", "tokenized", "art",
  ],
  Infrastructure: [
    "infrastructure", "sdk", "rpc", "wallet", "api", "node", "indexer", "oracles",
    "network", "bridge", "deployment", "soroban", "validator", "monitoring",
  ],
  Payments: [
    "payments", "payment", "remittance", "settlement", "cross-border", "transfer", "invoice",
    "checkout", "cards", "fiat", "stablecoin", "settle",
  ],
  DAO: [
    "dao", "governance", "voting", "treasury", "proposal", "community", "membership",
    "multisig", "onchain", "organization", "delegation", "govern",
  ],
};

const feedbackHistory = new Map<string, { accepted: number; rejected: number }>();

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value?: string): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/\s+/)
        .filter((token) => token.length > 2),
    ),
  );
}

function extractUrlTokens(url?: string): string[] {
  if (!url) return [];
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(www\.)?/, "").replace(/\.[a-z]{2,}$/i, "");
    const path = parsed.pathname.replace(/[^a-z0-9]+/gi, " ");
    return [...tokenize(host), ...tokenize(path)];
  } catch {
    return tokenize(url);
  }
}

function buildModel(): Record<string, Map<string, number>> {
  const projects = projectService.getAllProjects();
  const model: Record<string, Map<string, number>> = {};

  for (const category of CATEGORY_LABELS) {
    model[category] = new Map();
  }

  for (const project of projects) {
    const category = project.primaryCategory;
    if (!CATEGORY_LABELS.includes(category as typeof CATEGORY_LABELS[number])) continue;

    const tokens = new Set([
      ...tokenize(project.name),
      ...tokenize(project.description),
      ...tokenize(project.primaryCategory),
      ...(project.tags ?? []).flatMap((tag) => tokenize(tag)),
    ]);

    for (const token of tokens) {
      const current = model[category].get(token) ?? 0;
      model[category].set(token, current + 2);
    }
  }

  return model;
}

function applyFeedback(category: string, accepted: boolean): void {
  const key = category;
  const current = feedbackHistory.get(key) ?? { accepted: 0, rejected: 0 };
  if (accepted) current.accepted += 1;
  else current.rejected += 1;
  feedbackHistory.set(key, current);
}

function getAccuracy(): number {
  let accepted = 0;
  let rejected = 0;
  for (const value of feedbackHistory.values()) {
    accepted += value.accepted;
    rejected += value.rejected;
  }
  const total = accepted + rejected;
  if (!total) return 0.5;
  return Math.max(0, Math.min(1, accepted / total));
}

export function suggestProjectCategories(input: {
  description?: string;
  websiteUrl?: string;
  projectName?: string;
  feedback?: CategorySuggestionFeedback[];
}): {
  suggestions: CategorySuggestion[];
  modelVersion: string;
  fallbackUsed: boolean;
  accuracy: number;
} {
  if (input.feedback?.length) {
    for (const item of input.feedback) {
      if (item?.category) applyFeedback(item.category, item.accepted);
    }
  }

  const model = buildModel();
  const textTokens = new Set([
    ...tokenize(input.projectName),
    ...tokenize(input.description),
    ...extractUrlTokens(input.websiteUrl),
  ]);

  const suggestions = CATEGORY_LABELS.map((category) => {
    const weighted = CATEGORY_KEYWORDS[category] ?? [];
    const keywordHits = weighted.filter((keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      return Array.from(textTokens).some(
        (token) =>
          token === normalizedKeyword ||
          token.includes(normalizedKeyword) ||
          normalizedKeyword.includes(token),
      );
    });

    const modelScore = Array.from(textTokens).reduce((total, token) => {
      const weight = model[category].get(token) ?? 0;
      return total + weight;
    }, 0);

    const staticScore = keywordHits.length * 8;
    const finalScore = modelScore + staticScore;
    const baseConfidence = Math.min(1, finalScore / 32);
    const feedbackBoost =
      ((feedbackHistory.get(category)?.accepted ?? 0) - (feedbackHistory.get(category)?.rejected ?? 0)) * 0.04;

    return {
      category,
      score: Number((finalScore + feedbackBoost).toFixed(2)),
      confidence: Math.min(1, Math.max(0.08, Number((baseConfidence + feedbackBoost).toFixed(3)))),
      reasons: keywordHits.length > 0 ? keywordHits.slice(0, 3) : ["general category match"],
    };
  })
    .filter((item) => item.score > 0 || item.confidence > 0.08)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      confidence: Number(item.confidence.toFixed(3)),
      score: Number(item.score.toFixed(2)),
    }));

  const fallbackUsed = suggestions.length === 0 || suggestions.every((item) => item.score <= 0.1);

  return {
    suggestions,
    modelVersion: "project-category-suggestion-v1",
    fallbackUsed,
    accuracy: Number(getAccuracy().toFixed(3)),
  };
}
