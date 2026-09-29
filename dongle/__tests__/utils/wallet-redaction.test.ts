import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/utils/logger.util";
import { redactWalletAddress } from "@/utils/stellar-address.util";

const FULL_WALLET_ADDRESS_RE = /^G[A-Z2-7]{54}$/;
const VALID_WALLET_ADDRESS = `G${"A".repeat(55)}`;

const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

describe("wallet address redaction", () => {
  beforeEach(() => {
    consoleError.mockClear();
  });

  it("keeps the first five and last five address characters", () => {
    expect(redactWalletAddress(VALID_WALLET_ADDRESS)).toBe("GAAAA…AAAAA");
  });

  it("does not emit a full wallet address in logger messages", () => {
    logger.error("Wallet request failed", VALID_WALLET_ADDRESS);

    const output = consoleError.mock.calls[0].map(String).join(" ");
    expect(output).not.toMatch(FULL_WALLET_ADDRESS_RE);
    expect(output).not.toContain(VALID_WALLET_ADDRESS);
    expect(output).toContain("GAAAA…AAAAA");
  });

  it("redacts wallet addresses from error messages and stacks", () => {
    const error = new Error(`Request failed for ${VALID_WALLET_ADDRESS}`);
    logger.error("Wallet request failed", error);

    const loggedError = consoleError.mock.calls[0][2] as Error;
    expect(loggedError.message).not.toContain(VALID_WALLET_ADDRESS);
    expect(loggedError.message).toContain("GAAAA…AAAAA");
    expect(loggedError.stack).not.toContain(VALID_WALLET_ADDRESS);
  });
});
