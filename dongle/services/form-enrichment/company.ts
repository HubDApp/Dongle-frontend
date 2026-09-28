/**
 * Company Data Lookup Service for Form Enrichment
 */

import { extractDomain } from "@/lib/url";
import type { CompanyData } from "./types";

const CURATED_COMPANIES: Record<string, Partial<CompanyData>> = {
  "stellar.org": {
    companyName: "Stellar Development Foundation",
    legalName: "Stellar Development Foundation",
    domain: "stellar.org",
    industry: "Blockchain / FinTech",
    sector: "Infrastructure",
    employeeRange: "51-200",
    foundedYear: 2014,
    headquarters: "San Francisco, CA, USA",
    country: "United States",
    socialProfiles: {
      twitter: "https://twitter.com/StellarOrg",
      github: "https://github.com/stellar",
      discord: "https://discord.gg/stellar",
      linkedin: "https://linkedin.com/company/stellar-org",
    },
    techStack: ["Stellar Core", "Soroban", "Rust", "Go", "TypeScript"],
    logoUrl: "https://stellar.org/favicon.ico",
    verified: true,
    description: "An open network that allows anyone to move and store money globally.",
    confidence: 1.0,
  },
  "soroban.stellar.org": {
    companyName: "Soroban Smart Contracts",
    domain: "soroban.stellar.org",
    industry: "Smart Contracts / Web3",
    sector: "Infrastructure",
    employeeRange: "51-200",
    foundedYear: 2022,
    headquarters: "San Francisco, CA, USA",
    country: "United States",
    socialProfiles: {
      twitter: "https://twitter.com/StellarOrg",
      github: "https://github.com/stellar/soroban-tools",
      discord: "https://discord.gg/stellar",
    },
    techStack: ["Rust", "Wasm", "Soroban SDK", "TypeScript"],
    logoUrl: "https://soroban.stellar.org/favicon.ico",
    verified: true,
    description: "Batteries-included smart contracts platform built on Stellar.",
    confidence: 1.0,
  },
  "circle.com": {
    companyName: "Circle",
    legalName: "Circle Internet Financial Limited",
    domain: "circle.com",
    industry: "FinTech / Stablecoins",
    sector: "Payments",
    employeeRange: "500+",
    foundedYear: 2013,
    headquarters: "Boston, MA, USA",
    country: "United States",
    socialProfiles: {
      twitter: "https://twitter.com/circle",
      github: "https://github.com/circlefin",
      linkedin: "https://linkedin.com/company/circle-internet-financial",
    },
    techStack: ["USDC", "EURC", "APIs", "Go", "TypeScript"],
    logoUrl: "https://circle.com/favicon.ico",
    verified: true,
    description: "Financial services company and issuer of USDC and EURC.",
    confidence: 1.0,
  },
  "openzeppelin.com": {
    companyName: "OpenZeppelin",
    legalName: "OpenZeppelin Technologies",
    domain: "openzeppelin.com",
    industry: "Smart Contract Security",
    sector: "Infrastructure",
    employeeRange: "51-200",
    foundedYear: 2015,
    headquarters: "Remote / Buenos Aires",
    country: "Argentina",
    socialProfiles: {
      twitter: "https://twitter.com/OpenZeppelin",
      github: "https://github.com/OpenZeppelin",
    },
    techStack: ["Solidity", "Rust", "Soroban", "Auditing"],
    logoUrl: "https://openzeppelin.com/favicon.ico",
    verified: true,
    description: "The standard for secure blockchain applications.",
    confidence: 1.0,
  },
  "uniswap.org": {
    companyName: "Uniswap Labs",
    domain: "uniswap.org",
    industry: "DeFi / DEX",
    sector: "DeFi",
    employeeRange: "51-200",
    foundedYear: 2018,
    headquarters: "New York, NY, USA",
    country: "United States",
    socialProfiles: {
      twitter: "https://twitter.com/Uniswap",
      github: "https://github.com/Uniswap",
    },
    techStack: ["Solidity", "React", "TypeScript", "GraphQL"],
    logoUrl: "https://uniswap.org/favicon.ico",
    verified: true,
    description: "Decentralized trading protocol on blockchain.",
    confidence: 1.0,
  },
};

/**
 * Look up company data based on domain or company name
 */
export async function lookupCompany(
  domainOrName?: string | null,
): Promise<CompanyData | null> {
  if (!domainOrName || domainOrName.trim().length === 0) {
    return null;
  }

  const query = domainOrName.trim().toLowerCase();

  // Extract clean domain if a URL was provided
  let cleanDomain = "";
  try {
    cleanDomain = extractDomain(query).toLowerCase().replace(/^www\./, "");
  } catch {
    cleanDomain = query.replace(/^www\./, "").split("/")[0];
  }

  // 1. Direct match in curated company directory
  if (CURATED_COMPANIES[cleanDomain]) {
    return CURATED_COMPANIES[cleanDomain] as CompanyData;
  }

  for (const [key, data] of Object.entries(CURATED_COMPANIES)) {
    if (
      key.includes(cleanDomain) ||
      cleanDomain.includes(key) ||
      data.companyName?.toLowerCase().includes(query) ||
      query.includes(data.companyName?.toLowerCase() || "")
    ) {
      return data as CompanyData;
    }
  }

  // 2. Intelligent heuristic synthesis for arbitrary domains
  if (cleanDomain.includes(".")) {
    const brandName = cleanDomain
      .split(".")[0]
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return {
      companyName: brandName,
      domain: cleanDomain,
      industry: "Technology / Web3",
      sector: "Decentralized Applications",
      employeeRange: "11-50",
      headquarters: "Global / Remote",
      country: "Global",
      socialProfiles: {
        twitter: `https://twitter.com/${cleanDomain.split(".")[0]}`,
        github: `https://github.com/${cleanDomain.split(".")[0]}`,
      },
      techStack: ["TypeScript", "Smart Contracts", "Web3"],
      logoUrl: `https://${cleanDomain}/favicon.ico`,
      verified: false,
      confidence: 0.65,
    };
  }

  return null;
}
