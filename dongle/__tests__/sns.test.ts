/**
 * Unit tests for Stellar Name Service resolution (Issue #727).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  _clearOwnershipRegistry,
  _clearSnsCache,
  getOwnershipRecord,
  invalidateSnsCache,
  isDomainVerified,
  resetSnsResolver,
  resolveAddressToDomain,
  resolveDomainToAddress,
  setSnsResolver,
  verifyDomainOwnership,
} from "@/services/sns";
import {
  isValidSnsDomain,
  normalizeSnsDomain,
  type SnsResolver,
} from "@/types/sns";

const ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRS";

afterEach(async () => {
  resetSnsResolver();
  _clearOwnershipRegistry();
  await _clearSnsCache();
});

describe("domain helpers", () => {
  it("normalises case and leading @", () => {
    expect(normalizeSnsDomain("@Alice.Stellar")).toBe("alice.stellar");
  });

  it("validates the SNS domain shape", () => {
    expect(isValidSnsDomain("alice.stellar")).toBe(true);
    expect(isValidSnsDomain("@bob-2.stellar")).toBe(true);
    expect(isValidSnsDomain("alice.com")).toBe(false);
    expect(isValidSnsDomain("has space.stellar")).toBe(false);
  });
});

describe("resolveAddressToDomain", () => {
  it("resolves via the installed resolver", async () => {
    const resolver: SnsResolver = {
      lookupAddress: vi.fn().mockResolvedValue("alice.stellar"),
      lookupDomain: vi.fn(),
    };
    setSnsResolver(resolver);

    const result = await resolveAddressToDomain(ADDRESS);
    expect(result.domain).toBe("alice.stellar");
    expect(result.failed).toBe(false);
  });

  it("caches the result for subsequent calls", async () => {
    const lookupAddress = vi.fn().mockResolvedValue("alice.stellar");
    setSnsResolver({ lookupAddress, lookupDomain: vi.fn() });

    await resolveAddressToDomain(ADDRESS);
    const second = await resolveAddressToDomain(ADDRESS);
    expect(second.cached).toBe(true);
    expect(lookupAddress).toHaveBeenCalledTimes(1);
  });

  it("falls back gracefully when the lookup fails", async () => {
    setSnsResolver({
      lookupAddress: vi.fn().mockRejectedValue(new Error("rpc down")),
      lookupDomain: vi.fn(),
    });

    const result = await resolveAddressToDomain(ADDRESS);
    expect(result.domain).toBeNull();
    expect(result.failed).toBe(true);
  });

  it("returns null domain when nothing is registered", async () => {
    setSnsResolver({ lookupAddress: vi.fn().mockResolvedValue(null), lookupDomain: vi.fn() });
    const result = await resolveAddressToDomain(ADDRESS);
    expect(result.domain).toBeNull();
    expect(result.failed).toBe(false);
  });
});

describe("resolveDomainToAddress", () => {
  it("performs reverse lookup and caches", async () => {
    const lookupDomain = vi.fn().mockResolvedValue(ADDRESS);
    setSnsResolver({ lookupAddress: vi.fn(), lookupDomain });

    const first = await resolveDomainToAddress("@Alice.Stellar");
    expect(first.address).toBe(ADDRESS);
    expect(first.domain).toBe("alice.stellar");

    const second = await resolveDomainToAddress("alice.stellar");
    expect(second.cached).toBe(true);
    expect(lookupDomain).toHaveBeenCalledTimes(1);
  });

  it("falls back when the resolver throws", async () => {
    setSnsResolver({
      lookupAddress: vi.fn(),
      lookupDomain: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const result = await resolveDomainToAddress("ghost.stellar");
    expect(result.address).toBeNull();
    expect(result.failed).toBe(true);
  });
});

describe("admin ownership verification", () => {
  it("records and retrieves a verification", () => {
    const record = verifyDomainOwnership({
      domain: "Alice.Stellar",
      address: ADDRESS,
      verifiedBy: "GADMIN",
    });
    expect(record.domain).toBe("alice.stellar");
    expect(record.verifiedAt).toBeTruthy();
    expect(isDomainVerified("alice.stellar")).toBe(true);
    expect(getOwnershipRecord("@ALICE.stellar")?.address).toBe(ADDRESS);
  });

  it("returns null for unverified domains", () => {
    expect(getOwnershipRecord("nobody.stellar")).toBeNull();
    expect(isDomainVerified("nobody.stellar")).toBe(false);
  });
});

describe("invalidateSnsCache", () => {
  it("forces a fresh lookup after invalidation", async () => {
    const lookupAddress = vi.fn().mockResolvedValue("alice.stellar");
    setSnsResolver({ lookupAddress, lookupDomain: vi.fn() });

    await resolveAddressToDomain(ADDRESS);
    await invalidateSnsCache(ADDRESS, "alice.stellar");
    const afterInvalidate = await resolveAddressToDomain(ADDRESS);
    expect(afterInvalidate.cached).toBe(false);
    expect(lookupAddress).toHaveBeenCalledTimes(2);
  });
});
