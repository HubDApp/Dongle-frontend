import { projectService } from "@/services/project/project.service";
import type { Project } from "@/types/project";

const STOP_WORDS = new Set([
  "a","about","after","again","all","also","an","and","any","are","as","at","be","because","been","before","being","between","but","by","can","could","did","do","does","doing","for","from","get","go","going","had","has","have","having","he","her","here","his","how","i","if","in","into","is","it","its","just","like","made","make","many","me","more","most","my","new","no","not","of","on","one","only","or","our","out","over","platform","project","that","the","their","them","then","there","these","they","this","those","through","to","too","under","up","use","used","using","very","was","we","were","what","when","where","which","who","why","with","you","your"
]);

const tagFeedback = new Map<string, number>();

function normaliseTag(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function tokenise(value: string): string[] {
  return Array.from(new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 2 && !STOP_WORDS.has(part)),
  ));
}

function normaliseCategory(value?: string): string | undefined {
  if (!value) return undefined;
  return value.trim().toLowerCase();
}

function toTagName(tag: string): string {
  return normaliseTag(tag) || tag.trim().toLowerCase();
}

function scoreTagAgainstKeywords(tag: string, keywords: Set<string>): number {
  const tagName = toTagName(tag);
  const tagTokens = new Set(tagName.split(/[-\s]+/).filter(Boolean));
  let score = 0;

  for (const keyword of keywords) {
    if (tagName === keyword) score += 12;
    else if (tagName.includes(keyword) || keyword.includes(tagName)) score += 6;
    else if (Array.from(tagTokens).some((part) => part === keyword || part.startsWith(keyword) || keyword.startsWith(part))) score += 3;
  }

  return score;
}

export function registerTagFeedback(tag: string, relevant: boolean): void {
  const key = normaliseTag(tag);
  if (!key) return;

  const current = tagFeedback.get(key) ?? 0;
  tagFeedback.set(key, current + (relevant ? 1 : -4));
}

export interface TagSuggestionInput {
  description?: string;
  category?: string;
  projectName?: string;
  rating?: number;
  existingTags?: string[];
  similarProjects?: Project[];
  feedback?: Array<{ tag: string; relevant: boolean }>;
}

export function suggestTags(input: TagSuggestionInput): string[] {
  const description = input.description ?? "";
  const projectName = input.projectName ?? "";
  const category = normaliseCategory(input.category);
  const existingTags = new Set(
    (input.existingTags ?? []).map((tag) => normaliseTag(tag)).filter(Boolean),
  );

  if (Array.isArray(input.feedback)) {
    for (const item of input.feedback) {
      if (item && typeof item.tag === "string") {
        registerTagFeedback(item.tag, item.relevant);
      }
    }
  }

  const keywords = new Set<string>();
  for (const entry of [description, projectName, category ?? ""]) {
    for (const token of tokenise(entry ?? "")) {
      keywords.add(token);
    }
  }

  const projectPool = input.similarProjects && input.similarProjects.length > 0
    ? input.similarProjects
    : projectService.getAllProjects();

  const categoryProjects = category
    ? projectPool.filter((project) => normaliseCategory(project.primaryCategory) === category)
    : projectPool;

  const similarProjects = input.rating !== undefined
    ? (categoryProjects.length ? categoryProjects : projectPool).filter(
        (project) => Math.abs((project.rating ?? 0) - input.rating!) <= 1.5,
      )
    : (categoryProjects.length ? categoryProjects : projectPool);

  const tagScores = new Map<string, number>();

  for (const project of similarProjects.length ? similarProjects : projectPool) {
    for (const tag of project.tags ?? []) {
      const normalized = toTagName(tag);
      if (!normalized || existingTags.has(normalized)) continue;
      tagScores.set(normalized, (tagScores.get(normalized) ?? 0) + 2);
    }
  }

  for (const project of categoryProjects.length ? categoryProjects : projectPool) {
    for (const tag of project.tags ?? []) {
      const normalized = toTagName(tag);
      if (!normalized || existingTags.has(normalized)) continue;
      const frequencyBoost = project.tags?.filter((candidate) => toTagName(candidate) === normalized).length ?? 1;
      tagScores.set(normalized, (tagScores.get(normalized) ?? 0) + frequencyBoost * 3);
    }
  }

  for (const keyword of keywords) {
    for (const project of categoryProjects.length ? categoryProjects : projectPool) {
      for (const tag of project.tags ?? []) {
        const normalized = toTagName(tag);
        if (!normalized || existingTags.has(normalized)) continue;
        if (normalized.includes(keyword) || keyword.includes(normalized) || scoreTagAgainstKeywords(normalized, new Set([keyword])) > 0) {
          tagScores.set(normalized, (tagScores.get(normalized) ?? 0) + 5);
        }
      }
    }
  }

  const feedbackAdjusted = Array.from(tagScores.entries()).map(([tag, score]) => {
    const feedbackDelta = tagFeedback.get(tag) ?? 0;
    return { tag, score: score + feedbackDelta };
  });

  const asList = feedbackAdjusted
    .filter(({ tag }) => !existingTags.has(tag))
    .sort((left, right) => right.score - left.score || left.tag.localeCompare(right.tag))
    .slice(0, 10)
    .map(({ tag }) => tag);

  if (asList.length === 0 && description.trim()) {
    const fallback = Array.from(new Set(
      projectPool
        .filter((project) => !category || normaliseCategory(project.primaryCategory) === category)
        .flatMap((project) => project.tags ?? [])
        .map((tag) => toTagName(tag))
        .filter((tag) => tag && !existingTags.has(tag)),
    )).slice(0, 10);
    return fallback;
  }

  return asList;
}
