export interface Project {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  createdAt: string; // ISO date string
}

const categories = [
  "DeFi / DEX",
  "Gaming / NFT",
  "Infrastructure",
  "DAOs / Governance",
  "Social / Community"
];

// Helper to generate deterministic but seemingly random dates
const generateDate = (index: number) => {
  const baseDate = new Date("2023-01-01T00:00:00Z").getTime();
  const offset = index * 1000 * 60 * 60 * 24 * 3.14; // spread out roughly over time
  return new Date(baseDate + offset).toISOString();
};

const baseProjects: Partial<Project>[] = [
  {
    name: "Soroban Swap",
    category: "DeFi / DEX",
    description: "Next-generation automated market maker on Soroban.",
    rating: 4.8,
    reviews: 124,
  },
  {
    name: "Stellar Guardians",
    category: "Gaming / NFT",
    description: "A decentralized strategy game with on-chain assets.",
    rating: 4.5,
    reviews: 89,
  },
  {
    name: "Anchor Connect",
    category: "Infrastructure",
    description: "Seamless on/off ramp protocol for Stellar anchors.",
    rating: 4.9,
    reviews: 210,
  },
  {
    name: "Lumen Lend",
    category: "DeFi / DEX",
    description: "Decentralized lending and borrowing protocol for Stellar assets.",
    rating: 4.2,
    reviews: 45,
  },
  {
    name: "DAO Builder",
    category: "DAOs / Governance",
    description: "Create and manage your decentralized autonomous organization easily.",
    rating: 4.6,
    reviews: 156,
  },
  {
    name: "Stellar Social",
    category: "Social / Community",
    description: "A censorship-resistant social network powered by Soroban.",
    rating: 4.1,
    reviews: 32,
  },
  {
    name: "NFT Market",
    category: "Gaming / NFT",
    description: "Buy, sell, and discover exclusive digital items and NFTs.",
    rating: 4.7,
    reviews: 305,
  },
  {
    name: "Token Forge",
    category: "Infrastructure",
    description: "No-code platform to mint and manage Stellar tokens.",
    rating: 4.4,
    reviews: 88,
  },
  {
    name: "Yield Farm",
    category: "DeFi / DEX",
    description: "Maximize your returns with automated yield farming strategies.",
    rating: 4.3,
    reviews: 112,
  }
];

// Generate 50+ projects by duplicating and modifying base projects
export const mockProjects: Project[] = Array.from({ length: 60 }).map((_, i) => {
  const base = baseProjects[i % baseProjects.length];
  const iteration = Math.floor(i / baseProjects.length);
  
  return {
    id: `proj-${i}`,
    name: iteration === 0 ? base.name! : `${base.name} V${iteration + 1}`,
    category: base.category!,
    description: base.description!,
    // Add some variance to ratings and reviews for sorting testing
    rating: Number((Math.max(1, base.rating! - (iteration * 0.1) + (Math.sin(i) * 0.5))).toFixed(1)),
    reviews: Math.max(0, base.reviews! + Math.floor(Math.cos(i) * 50) + iteration * 10),
    createdAt: generateDate(i),
  };
});
