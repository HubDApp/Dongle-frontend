/**
 * Custom error classes for the Dongle frontend (#424).
 *
 * Every service method that can fail in a domain-specific way should throw
 * one of these instead of a plain `Error`.  The error-mapper util knows how
 * to turn each class into a user-friendly message.
 */

// ── Base ──────────────────────────────────────────────────────────────────────

/** Base class for all domain errors. Carries an optional `code` for machine
 *  parsing and an `actionable` hint shown to the user. */
export class DomainError extends Error {
  readonly code: string;
  readonly actionable?: string;

  constructor(message: string, code: string, actionable?: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.actionable = actionable;
  }
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export class WalletError extends DomainError {
  constructor(message: string, code = "WALLET_ERROR", actionable?: string) {
    super(message, code, actionable);
  }
}

export class WalletNotConnectedError extends WalletError {
  constructor() {
    super(
      "No wallet connected. Please connect your Freighter wallet and try again.",
      "WALLET_NOT_CONNECTED",
      "Click the Connect Wallet button and approve the Freighter prompt.",
    );
  }
}

export class WalletLockedError extends WalletError {
  constructor() {
    super(
      "Your wallet is locked.",
      "WALLET_LOCKED",
      "Please unlock Freighter and try again.",
    );
  }
}

export class WalletNotInstalledError extends WalletError {
  constructor() {
    super(
      "Freighter wallet extension is not installed.",
      "WALLET_NOT_INSTALLED",
      "Please install Freighter from the Chrome Web Store or Firefox Add-ons.",
    );
  }
}

// ── Network ───────────────────────────────────────────────────────────────────

export class NetworkError extends DomainError {
  constructor(message: string, code = "NETWORK_ERROR", actionable?: string) {
    super(message, code, actionable);
  }
}

export class NetworkTimeoutError extends NetworkError {
  constructor() {
    super(
      "The request timed out. The network may be slow or unavailable.",
      "NETWORK_TIMEOUT",
      "Please check your internet connection and try again.",
    );
  }
}

export class NetworkMismatchError extends NetworkError {
  readonly expectedNetwork: string;
  readonly actualNetwork: string | null;

  constructor(actual: string | null, expected: string, expectedLabel: string) {
    const actualLabel = actual?.slice(0, 8) ?? "unknown";
    super(
      `Wrong network: wallet is on ${actualLabel}, but this app requires ${expectedLabel}.`,
      "NETWORK_MISMATCH",
      `Please switch your Freighter wallet to ${expectedLabel} and try again.`,
    );
    this.expectedNetwork = expected;
    this.actualNetwork = actual;
  }
}

// ── Soroban / Smart Contract ──────────────────────────────────────────────────

export class SorobanError extends DomainError {
  constructor(message: string, code = "SOROBAN_ERROR", actionable?: string) {
    super(message, code, actionable);
  }
}

export class TransactionFailedError extends SorobanError {
  readonly txHash?: string;

  constructor(message: string, txHash?: string) {
    super(
      message,
      "TX_FAILED",
      "Please check the transaction details and try again.",
    );
    this.txHash = txHash;
  }
}

export class ContractCallError extends SorobanError {
  constructor(message: string) {
    super(
      message,
      "CONTRACT_CALL_FAILED",
      "There was an issue with the smart contract. Please try again.",
    );
  }
}

// ── Account ───────────────────────────────────────────────────────────────────

export class AccountError extends DomainError {
  constructor(message: string, code = "ACCOUNT_ERROR", actionable?: string) {
    super(message, code, actionable);
  }
}

export class InsufficientBalanceError extends AccountError {
  constructor() {
    super(
      "Insufficient balance to complete this transaction.",
      "INSUFFICIENT_BALANCE",
      "Please add more XLM to your account.",
    );
  }
}

// ── Storage ───────────────────────────────────────────────────────────────────

export class StorageError extends DomainError {
  constructor(message: string, code = "STORAGE_ERROR", actionable?: string) {
    super(message, code, actionable);
  }
}

// ── Data Integrity ────────────────────────────────────────────────────────────

export class DataIntegrityError extends DomainError {
  constructor(message: string) {
    super(
      message,
      "DATA_INTEGRITY_ERROR",
      "The imported data appears to be corrupted or invalid.",
    );
  }
}
