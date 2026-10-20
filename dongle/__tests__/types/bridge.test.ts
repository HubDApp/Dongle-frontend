/**
 * Unit tests for cross-chain bridge configuration (Issue #726).
 */

import { describe, expect, it } from "vitest";
import {
  BRIDGE_CHAINS,
  BRIDGE_CHAIN_LABELS,
  createEmptyBridgeConfig,
  isValidBridgeAddress,
  validateBridgeConfig,
  type BridgeConfig,
} from "@/types/bridge";

const EVM = "0x1234567890abcdef1234567890abcdef12345678";
const SOLANA = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

describe("constants", () => {
  it("lists the four supported chains with labels", () => {
    expect(BRIDGE_CHAINS).toEqual(["ethereum", "polygon", "bsc", "solana"]);
    for (const chain of BRIDGE_CHAINS) {
      expect(BRIDGE_CHAIN_LABELS[chain]).toBeTruthy();
    }
  });
});

describe("isValidBridgeAddress", () => {
  it("accepts EVM addresses for ethereum/polygon/bsc", () => {
    for (const chain of ["ethereum", "polygon", "bsc"] as const) {
      expect(isValidBridgeAddress(chain, EVM)).toBe(true);
    }
  });

  it("accepts base58 program IDs for solana", () => {
    expect(isValidBridgeAddress("solana", SOLANA)).toBe(true);
  });

  it("rejects mismatched formats", () => {
    expect(isValidBridgeAddress("ethereum", SOLANA)).toBe(false);
    expect(isValidBridgeAddress("solana", EVM)).toBe(false);
    expect(isValidBridgeAddress("ethereum", "")).toBe(false);
  });
});

describe("validateBridgeConfig", () => {
  it("treats undefined/disabled configs as valid (optional section)", () => {
    expect(validateBridgeConfig(undefined)).toEqual([]);
    expect(validateBridgeConfig(createEmptyBridgeConfig())).toEqual([]);
  });

  it("requires at least one chain when enabled", () => {
    const errors = validateBridgeConfig({ enabled: true, chains: [] });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("chains");
  });

  it("flags missing and malformed bridge addresses", () => {
    const config: BridgeConfig = {
      enabled: true,
      chains: [
        { chain: "ethereum", bridgeAddress: "", audited: false, liquidity: "unknown" },
        { chain: "solana", bridgeAddress: "not-base58!", audited: false, liquidity: "low" },
      ],
    };
    const errors = validateBridgeConfig(config);
    expect(errors.some((e) => e.field === "bridgeAddress" && e.index === 0)).toBe(true);
    expect(errors.some((e) => e.field === "bridgeAddress" && e.index === 1)).toBe(true);
  });

  it("detects duplicate chain entries", () => {
    const config: BridgeConfig = {
      enabled: true,
      chains: [
        { chain: "polygon", bridgeAddress: EVM, audited: true, liquidity: "high" },
        { chain: "polygon", bridgeAddress: EVM, audited: true, liquidity: "high" },
      ],
    };
    const errors = validateBridgeConfig(config);
    expect(errors.some((e) => e.field === "chain" && e.index === 1)).toBe(true);
  });

  it("validates URL fields", () => {
    const config: BridgeConfig = {
      enabled: true,
      chains: [
        {
          chain: "bsc",
          bridgeAddress: EVM,
          bridgeUrl: "not-a-url",
          audited: true,
          auditReportUrl: "ftp://bad",
          liquidity: "medium",
        },
      ],
    };
    const errors = validateBridgeConfig(config);
    expect(errors.some((e) => e.field === "bridgeUrl")).toBe(true);
    expect(errors.some((e) => e.field === "auditReportUrl")).toBe(true);
  });

  it("accepts a fully valid config", () => {
    const config: BridgeConfig = {
      enabled: true,
      chains: [
        {
          chain: "ethereum",
          bridgeAddress: EVM,
          bridgeUrl: "https://bridge.example.com",
          audited: true,
          auditReportUrl: "https://audit.example.com/report",
          liquidity: "high",
          experimental: false,
        },
        { chain: "solana", bridgeAddress: SOLANA, audited: false, liquidity: "unknown" },
      ],
    };
    expect(validateBridgeConfig(config)).toEqual([]);
  });
});

describe("createEmptyBridgeConfig", () => {
  it("returns a disabled, chainless config", () => {
    expect(createEmptyBridgeConfig()).toEqual({ enabled: false, chains: [] });
  });
});
