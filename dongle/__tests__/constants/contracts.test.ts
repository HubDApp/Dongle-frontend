import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseEnv,
  ContractIdSchema,
  PublicKeySchema,
  DEV_CONTRACT_PLACEHOLDER,
  DEV_RPC_URL,
  DEV_NETWORK_PASSPHRASE,
} from "../../constants/contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CONTRACT = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const VALID_CONTRACT_2 = "CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const VALID_PUBLIC_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const FULL_VALID_ENV = {
  NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: VALID_CONTRACT,
  NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: VALID_CONTRACT,
  NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: VALID_CONTRACT,
  NEXT_PUBLIC_SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org:443",
  NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
};

// ---------------------------------------------------------------------------
// ContractIdSchema
// ---------------------------------------------------------------------------

describe("ContractIdSchema", () => {
  it("accepts a valid 56-char contract ID starting with C", () => {
    expect(() => ContractIdSchema.parse(VALID_CONTRACT)).not.toThrow();
  });

  it("accepts a contract ID using all allowed base-32 chars (A-Z, 2-7)", () => {
    // 'C' + 55 chars from the set A-Z and 2-7
    const id = "C" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".repeat(2).slice(0, 55);
    expect(() => ContractIdSchema.parse(id)).not.toThrow();
  });

  it("rejects an ID that does not start with C", () => {
    expect(() =>
      ContractIdSchema.parse("G" + VALID_CONTRACT.slice(1)),
    ).toThrow("Invalid Stellar Contract ID format");
  });

  it("rejects an ID that is too short", () => {
    expect(() => ContractIdSchema.parse("C" + "A".repeat(40))).toThrow(
      "Invalid Stellar Contract ID format",
    );
  });

  it("rejects an ID that is too long", () => {
    expect(() => ContractIdSchema.parse("C" + "A".repeat(56))).toThrow(
      "Invalid Stellar Contract ID format",
    );
  });

  it("rejects lowercase characters", () => {
    expect(() =>
      ContractIdSchema.parse("C" + "a".repeat(55)),
    ).toThrow("Invalid Stellar Contract ID format");
  });

  it("rejects the original placeholder string used in the broken version", () => {
    expect(() =>
      ContractIdSchema.parse("CDONGLE_REVIEW_REGISTRY_PLACEHOLDER"),
    ).toThrow("Invalid Stellar Contract ID format");
  });

  it("rejects an empty string", () => {
    expect(() => ContractIdSchema.parse("")).toThrow(
      "Invalid Stellar Contract ID format",
    );
  });
});

// ---------------------------------------------------------------------------
// PublicKeySchema
// ---------------------------------------------------------------------------

describe("PublicKeySchema", () => {
  it("accepts a valid 56-char public key starting with G", () => {
    expect(() => PublicKeySchema.parse(VALID_PUBLIC_KEY)).not.toThrow();
  });

  it("rejects a key that does not start with G", () => {
    expect(() =>
      PublicKeySchema.parse("C" + VALID_PUBLIC_KEY.slice(1)),
    ).toThrow("Invalid Stellar Public Key format");
  });

  it("rejects a key that is too short", () => {
    expect(() => PublicKeySchema.parse("G" + "A".repeat(30))).toThrow(
      "Invalid Stellar Public Key format",
    );
  });
});

// ---------------------------------------------------------------------------
// parseEnv — development / test mode (isDev = true)
// ---------------------------------------------------------------------------

describe("parseEnv — dev mode", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns safe defaults when all variables are missing", () => {
    const env = parseEnv({}, true);
    expect(env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT).toBe(DEV_CONTRACT_PLACEHOLDER);
    expect(env.NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT).toBe(DEV_CONTRACT_PLACEHOLDER);
    expect(env.NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT).toBe(DEV_CONTRACT_PLACEHOLDER);
    expect(env.NEXT_PUBLIC_SOROBAN_RPC_URL).toBe(DEV_RPC_URL);
    expect(env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE).toBe(DEV_NETWORK_PASSPHRASE);
  });

  it("uses provided values over defaults when they are valid", () => {
    const env = parseEnv(
      {
        NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: VALID_CONTRACT_2,
        NEXT_PUBLIC_SOROBAN_RPC_URL: "https://custom.rpc.example.com",
      },
      true,
    );
    expect(env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT).toBe(VALID_CONTRACT_2);
    expect(env.NEXT_PUBLIC_SOROBAN_RPC_URL).toBe("https://custom.rpc.example.com");
    // Unset fields still fall back to defaults
    expect(env.NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT).toBe(DEV_CONTRACT_PLACEHOLDER);
  });

  it("throws when a provided contract ID is invalid even in dev mode", () => {
    expect(() =>
      parseEnv(
        { NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: "CDONGLE_REVIEW_REGISTRY_PLACEHOLDER" },
        true,
      ),
    ).toThrow();
  });

  it("throws when a provided RPC URL is not a valid URL even in dev mode", () => {
    expect(() =>
      parseEnv({ NEXT_PUBLIC_SOROBAN_RPC_URL: "not-a-url" }, true),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseEnv — production mode (isDev = false)
// ---------------------------------------------------------------------------

describe("parseEnv — production mode", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when all variables are missing", () => {
    expect(() => parseEnv({}, false)).toThrow();
  });

  it("throws when contract IDs are missing and no defaults apply", () => {
    expect(() =>
      parseEnv(
        {
          NEXT_PUBLIC_SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org:443",
          NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
        },
        false,
      ),
    ).toThrow();
  });

  it("succeeds with a fully valid environment", () => {
    const env = parseEnv(FULL_VALID_ENV, false);
    expect(env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT).toBe(VALID_CONTRACT);
    expect(env.NEXT_PUBLIC_SOROBAN_RPC_URL).toBe(
      "https://soroban-testnet.stellar.org:443",
    );
    expect(env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE).toBe(
      "Test SDF Network ; September 2015",
    );
  });

  it("throws on an invalid contract ID format in production", () => {
    expect(() =>
      parseEnv(
        {
          ...FULL_VALID_ENV,
          NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: "CDONGLE_REVIEW_REGISTRY_PLACEHOLDER",
        },
        false,
      ),
    ).toThrow();
  });

  it("throws on an invalid RPC URL in production", () => {
    expect(() =>
      parseEnv(
        { ...FULL_VALID_ENV, NEXT_PUBLIC_SOROBAN_RPC_URL: "not-a-valid-url" },
        false,
      ),
    ).toThrow();
  });

  it("throws on an empty network passphrase in production", () => {
    expect(() =>
      parseEnv(
        { ...FULL_VALID_ENV, NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: "" },
        false,
      ),
    ).toThrow();
  });

  it("throws when only one of the three contract IDs is missing", () => {
    const { NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: _omit, ...partial } =
      FULL_VALID_ENV;
    expect(() => parseEnv(partial, false)).toThrow();
  });

  it("error message reports the count of invalid fields", () => {
    // Two fields missing → error should mention the count
    expect(() =>
      parseEnv(
        {
          NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: VALID_CONTRACT,
          // REVIEW and VERIFICATION missing
          NEXT_PUBLIC_SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org:443",
          NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
        },
        false,
      ),
    ).toThrow(/2 error/);
  });

  it("does NOT apply dev defaults during a production build (isBuild scenario)", () => {
    // Simulate the environment a CI server would have during `next build`
    // when the operator forgot to set contract IDs — this should hard-fail,
    // not silently fall back to placeholder values.
    expect(() => parseEnv({}, false)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Exported constants (DEV_CONTRACT_PLACEHOLDER et al.)
// ---------------------------------------------------------------------------

describe("exported constants", () => {
  it("DEV_CONTRACT_PLACEHOLDER is a valid Stellar contract ID", () => {
    expect(() => ContractIdSchema.parse(DEV_CONTRACT_PLACEHOLDER)).not.toThrow();
  });

  it("DEV_RPC_URL is a non-empty string", () => {
    expect(DEV_RPC_URL.length).toBeGreaterThan(0);
  });

  it("DEV_NETWORK_PASSPHRASE is a non-empty string", () => {
    expect(DEV_NETWORK_PASSPHRASE.length).toBeGreaterThan(0);
  });
});
