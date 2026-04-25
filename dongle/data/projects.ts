export type ProjectCategory =
  | "All"
  | "DeFi / DEX"
  | "Gaming / NFT"
  | "Infrastructure"
  | "Payments"
  | "DAO";

export interface Project {
  id: string;
  name: string;
  category: Exclude<ProjectCategory, "All">;
  description: string;
  rating: number;
  reviews: number;
  createdAt: string; // ISO date string
}

export const ALL_CATEGORIES: ProjectCategory[] = [
  "All",
  "DeFi / DEX",
  "Gaming / NFT",
  "Infrastructure",
  "Payments",
  "DAO",
];

export const projects: Project[] = [
  {
    id: "soroban-swap",
    name: "Soroban Swap",
    category: "DeFi / DEX",
    description: "Next-generation automated market maker on Soroban.",
    rating: 4.8,
    reviews: 124,
    createdAt: "2024-11-10T00:00:00Z",
  },
  {
    id: "stellar-guardians",
    name: "Stellar Guardians",
    category: "Gaming / NFT",
    description: "A decentralized strategy game with on-chain assets.",
    rating: 4.5,
    reviews: 89,
    createdAt: "2024-09-22T00:00:00Z",
  },
  {
    id: "anchor-connect",
    name: "Anchor Connect",
    category: "Infrastructure",
    description: "Seamless on/off ramp protocol for Stellar anchors.",
    rating: 4.9,
    reviews: 210,
    createdAt: "2024-08-05T00:00:00Z",
  },
  {
    id: "xlm-pay",
    name: "XLM Pay",
    category: "Payments",
    description: "Instant cross-border payments powered by Stellar.",
    rating: 4.6,
    reviews: 175,
    createdAt: "2025-01-14T00:00:00Z",
  },
  {
    id: "stellar-dao",
    name: "Stellar DAO",
    category: "DAO",
    description: "On-chain governance and treasury management for Stellar communities.",
    rating: 4.3,
    reviews: 62,
    createdAt: "2025-02-28T00:00:00Z",
  },
  {
    id: "nft-forge",
    name: "NFT Forge",
    category: "Gaming / NFT",
    description: "Mint, trade, and showcase NFTs on the Stellar network.",
    rating: 4.4,
    reviews: 98,
    createdAt: "2025-03-15T00:00:00Z",
  },
];
