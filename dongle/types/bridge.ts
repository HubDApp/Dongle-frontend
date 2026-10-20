/**
 * Cross-chain bridge information types (Issue #726).
 *
 * Projects that operate on multiple chains can publish optional bridge
 * configuration so users can safely move assets between chains.
 */

/** Chains a project may bridge to/from. */
export type BridgeChain = "ethereum" | "polygon" | "bsc" | "solana";

export const BRIDGE_CHAINS: BridgeChain[] = [
  "ethereum",
  "polygon",
  "bsc",
  "solana",
];

/** Human-readable chain names. */
export const BRIDGE_CHAIN_LABELS: Record<BridgeChain, string> = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  bsc: "BNB Smart Chain",
  solana: "Solana",
};

/** How well-liquid a bridge pool is (a rough user-facing signal). */
export type BridgeLiquidity = "high" | "medium" | "low" | "unknown";

export const BRIDGE_LIQUIDITY_LABELS: Record<BridgeLiquidity, string> = {
  high: "High liquidity",
  medium: "Medium liquidity",
  low: "Low liquidity",
  unknown: "Liquidity unknown",
};

/** A single chain's bridge entry. */
export interface BridgeChainConfig {
  chain: BridgeChain;
  /** The bridge contract/program address on that chain. */
  bridgeAddress: string;
  /** Deep link to the bridge UI for this route. */
  bridgeUrl?: string;
  /** Whether the bridge has been security-audited. */
  audited: boolean;
  /** Link to the audit report, when available. */
  auditReportUrl?: string;
  /** Coarse liquidity indicator. */
  liquidity: BridgeLiquidity;
  /** When true, the UI shows an "experimental" warning. */
  experimental?: boolean;
}

/** Optional bridge section on a project. */
export interface BridgeConfig {
  /** Whether the project exposes any bridge routes. */
  enabled: boolean;
  /** Per-chain bridge entries. */
  chains: BridgeChainConfig[];
}

/** A single validation error for the bridge config. */
export interface BridgeValidationError {
  /** Index into `chains` when the error is chain-specific. */
  index?: number;
  field: keyof BridgeChainConfig | "chains" | "enabled";
  message: string;
}

/**
 * EVM addresses (Ethereum/Polygon/BSC) are 0x-prefixed 40-hex strings.
 * Solana program IDs are base58, 32–44 chars.
 */
export const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
export const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** True when the address is valid for the given chain. */
export function isValidBridgeAddress(chain: BridgeChain, address: string): boolean {
  if (!address || !address.trim()) return false;
  const trimmed = address.trim();
  if (chain === "solana") return SOLANA_ADDRESS_REGEX.test(trimmed);
  return EVM_ADDRESS_REGEX.test(trimmed);
}

/**
 * Validate a bridge config. Empty/disabled configs are valid (the section is
 * optional). Returns an empty array when everything is valid.
 */
export function validateBridgeConfig(
  config: BridgeConfig | undefined,
): BridgeValidationError[] {
  if (!config || !config.enabled) return [];

  const errors: BridgeValidationError[] = [];

  if (config.chains.length === 0) {
    errors.push({
      field: "chains",
      message: "Add at least one chain when the bridge section is enabled.",
    });
    return errors;
  }

  const seen = new Set<BridgeChain>();

  config.chains.forEach((entry, index) => {
    if (seen.has(entry.chain)) {
      errors.push({
        index,
        field: "chain",
        message: `Duplicate bridge entry for ${BRIDGE_CHAIN_LABELS[entry.chain]}.`,
      });
    }
    seen.add(entry.chain);

    if (!entry.bridgeAddress || !entry.bridgeAddress.trim()) {
      errors.push({
        index,
        field: "bridgeAddress",
        message: `Bridge address is required for ${BRIDGE_CHAIN_LABELS[entry.chain]}.`,
      });
    } else if (!isValidBridgeAddress(entry.chain, entry.bridgeAddress)) {
      errors.push({
        index,
        field: "bridgeAddress",
        message: `Invalid bridge address for ${BRIDGE_CHAIN_LABELS[entry.chain]}.`,
      });
    }

    if (entry.bridgeUrl && !/^https?:\/\//i.test(entry.bridgeUrl)) {
      errors.push({
        index,
        field: "bridgeUrl",
        message: "Bridge URL must start with http:// or https://.",
      });
    }

    if (entry.audited && entry.auditReportUrl && !/^https?:\/\//i.test(entry.auditReportUrl)) {
      errors.push({
        index,
        field: "auditReportUrl",
        message: "Audit report URL must start with http:// or https://.",
      });
    }
  });

  return errors;
}

/** An empty bridge config, used as a form default. */
export function createEmptyBridgeConfig(): BridgeConfig {
  return { enabled: false, chains: [] };
}
