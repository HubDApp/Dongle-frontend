/**
 * Review templates by category (#680).
 * Provides structured prompts to help first-time reviewers.
 */

export type TemplateCategory = "defi" | "nft" | "gaming" | "tools";

export interface ReviewTemplate {
  category: TemplateCategory;
  label: string;
  prompts: string[];
}

export const REVIEW_TEMPLATES: Record<TemplateCategory, ReviewTemplate> = {
  defi: {
    category: "defi",
    label: "DeFi",
    prompts: [
      "How secure is the protocol? (audits, exploit history, insurance)",
      "How are the fees compared to alternatives?",
      "How is the liquidity and depth of the markets?",
      "How is the overall user experience (UX)?",
    ],
  },
  nft: {
    category: "nft",
    label: "NFT",
    prompts: [
      "How would you rate the collection's art and concept?",
      "How is the rarity structure and mint mechanics?",
      "How active and engaged is the community?",
      "How credible is the roadmap and delivery track record?",
    ],
  },
  gaming: {
    category: "gaming",
    label: "Gaming",
    prompts: [
      "How enjoyable is the core gameplay loop?",
      "How are the graphics and overall polish?",
      "How balanced is the in-game economy?",
      "Are there notable bugs or performance issues?",
    ],
  },
  tools: {
    category: "tools",
    label: "Tools",
    prompts: [
      "How useful are the key features for your workflow?",
      "How is the performance and reliability?",
      "How responsive is the support team?",
      "How does the pricing compare to alternatives?",
    ],
  },
};

export const TEMPLATE_CATEGORIES = Object.keys(REVIEW_TEMPLATES) as TemplateCategory[];
