import { Project, PROJECT_CATEGORIES } from "@/types/project";
import { extractDomain } from "@/lib/url";

// Helper to generate deterministic but seemingly random dates
const generateDate = (index: number) => {
  const baseDate = new Date("2023-01-01T00:00:00Z").getTime();
  const offset = index * 1000 * 60 * 60 * 24 * 3.14; // spread out roughly over time
  return new Date(baseDate + offset).toISOString();
};

const baseProjects: Partial<Project>[] = [
  {
    name: "Soroban Swap",
    category: PROJECT_CATEGORIES.DEFI,
    primaryCategory: PROJECT_CATEGORIES.DEFI,
    tags: ["DEX", "AMM"],
    description: "Next-generation automated market maker on Soroban.",
    rating: 4.8,
    reviews: 124,
    websiteUrl: "https://soroban-swap.example.com",
    githubUrl: "https://github.com/example/soroban-swap",
    docsUrl: "https://docs.soroban-swap.example.com",
  },
  {
    name: "Stellar Guardians",
    category: PROJECT_CATEGORIES.GAMING,
    primaryCategory: PROJECT_CATEGORIES.GAMING,
    tags: ["Strategy", "P2E"],
    description: "A decentralized strategy game with on-chain assets.",
    rating: 4.5,
    reviews: 89,
    websiteUrl: "https://stellar-guardians.example.com",
    githubUrl: "https://github.com/example/stellar-guardians",
  },
  {
    name: "Anchor Connect",
    category: PROJECT_CATEGORIES.INFRASTRUCTURE,
    primaryCategory: PROJECT_CATEGORIES.INFRASTRUCTURE,
    tags: ["On-ramp", "SDK"],
    description: "Seamless on/off ramp protocol for Stellar anchors.",
    rating: 4.9,
    reviews: 210,
    websiteUrl: "https://anchor-connect.example.com",
    githubUrl: "https://github.com/example/anchor-connect",
    docsUrl: "https://docs.anchor-connect.example.com",
  },
  {
    name: "XLM Pay",
    category: PROJECT_CATEGORIES.PAYMENTS,
    primaryCategory: PROJECT_CATEGORIES.PAYMENTS,
    tags: ["Payments", "Cross-border"],
    description: "Instant cross-border payments powered by Stellar.",
    rating: 4.6,
    reviews: 175,
    websiteUrl: "https://xlm-pay.example.com",
  },
  {
    name: "DAO Builder",
    category: PROJECT_CATEGORIES.DAO,
    primaryCategory: PROJECT_CATEGORIES.DAO,
    tags: ["Governance", "No-code"],
    description: "Create and manage your decentralized autonomous organization easily.",
    rating: 4.6,
    reviews: 156,
    websiteUrl: "https://dao-builder.example.com",
    githubUrl: "https://github.com/example/dao-builder",
    docsUrl: "https://docs.dao-builder.example.com",
  },
  {
    name: "Stellar Social",
    category: PROJECT_CATEGORIES.DAO,
    primaryCategory: PROJECT_CATEGORIES.DAO,
    tags: ["Social", "Web3"],
    description: "A censorship-resistant social network powered by Soroban.",
    rating: 4.1,
    reviews: 32,
    websiteUrl: "https://stellar-social.example.com",
  },
  {
    name: "NFT Market",
    category: PROJECT_CATEGORIES.GAMING,
    primaryCategory: PROJECT_CATEGORIES.GAMING,
    tags: ["NFT", "Marketplace"],
    description: "Buy, sell, and discover exclusive digital items and NFTs.",
    rating: 4.7,
    reviews: 305,
    websiteUrl: "https://nft-market.example.com",
    githubUrl: "https://github.com/example/nft-market",
  },
  {
    name: "Token Forge",
    category: PROJECT_CATEGORIES.INFRASTRUCTURE,
    primaryCategory: PROJECT_CATEGORIES.INFRASTRUCTURE,
    tags: ["Tokens", "Minting"],
    description: "No-code platform to mint and manage Stellar tokens.",
    rating: 4.4,
    reviews: 88,
    websiteUrl: "https://token-forge.example.com",
    githubUrl: "https://github.com/example/token-forge",
    docsUrl: "https://docs.token-forge.example.com",
  },
  {
    name: "Yield Farm",
    category: PROJECT_CATEGORIES.DEFI,
    primaryCategory: PROJECT_CATEGORIES.DEFI,
    tags: ["Yield", "Auto-compounding"],
    description: "Maximize your returns with automated yield farming strategies.",
    rating: 4.3,
    reviews: 112,
    websiteUrl: "https://yield-farm.example.com",
    githubUrl: "https://github.com/example/yield-farm",
  },
];

// Generate 50+ projects by duplicating and modifying base projects
export const mockProjects: Project[] = Array.from({ length: 60 }).map(
  (_, i) => {
    const base = baseProjects[i % baseProjects.length];
    const iteration = Math.floor(i / baseProjects.length);

    return {
      id: `proj-${i}`,
      name: iteration === 0 ? base.name! : `${base.name} V${iteration + 1}`,
      category: base.category,
      primaryCategory: base.primaryCategory!,
      tags: base.tags || [],
      description: base.description!,
      // Add some variance to ratings and reviews for sorting testing
      rating: Number(
        Math.min(5, Math.max(1, base.rating! - iteration * 0.1 + Math.sin(i) * 0.5)).toFixed(
          1,
        ),
      ),
      reviews: Math.max(
        0,
        base.reviews! + Math.floor(Math.cos(i) * 50) + iteration * 10,
      ),
      createdAt: generateDate(i),
      websiteUrl: base.websiteUrl,
      githubUrl: base.githubUrl,
      logoUrl: base.logoUrl,
      docsUrl: base.docsUrl,
      domain: base.websiteUrl ? extractDomain(base.websiteUrl) : undefined,
    };
  },
);
