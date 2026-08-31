/**
 * Error Mapper for Stellar, Soroban, Wallet, and Storage Operations
 * Converts technical errors into user-friendly messages while preserving developer diagnostics
 * 
 * Now integrated with centralized error code system from @/constants/error-codes
 */

import {
  DomainError,
  WalletError,
  WalletNotConnectedError,
  WalletLockedError,
  WalletNotInstalledError,
  NetworkError,
  NetworkTimeoutError,
  NetworkMismatchError,
  SorobanError,
  TransactionFailedError,
  ContractCallError,
  AccountError,
  InsufficientBalanceError,
  StorageError,
  DataIntegrityError,
} from "@/lib/errors";

export interface MappedError {
  userMessage: string;
  technicalDetails?: string;
  code: ErrorCode;
  actionable?: string;
  /** Whether this error should be reported to Sentry/monitoring */
  shouldReport?: boolean;
}

export type ErrorCategory =
  | "wallet"
  | "network"
  | "stellar"
  | "soroban"
  | "storage"
  | "transaction"
  | "account"
  | "unknown";

/**
 * Maps technical error messages to user-friendly messages.
 *
 * If the error is an instance of one of the custom error classes defined in
 * `@/lib/errors`, the mapping is immediate — no string heuristics needed.
 */
export function mapError(error: unknown, category?: ErrorCategory): MappedError {
  // Fast-path: custom error classes carry their own user-friendly payload.
  if (error instanceof WalletNotConnectedError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof WalletLockedError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof WalletNotInstalledError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof WalletError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof NetworkTimeoutError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof NetworkMismatchError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof NetworkError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof TransactionFailedError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof ContractCallError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof SorobanError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof InsufficientBalanceError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof AccountError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof StorageError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof DataIntegrityError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }
  if (error instanceof DomainError) {
    return { userMessage: error.message, code: error.code, actionable: error.actionable, technicalDetails: error.message };
  }

  // Legacy path: string-based heuristics for plain Error / unknown values.
  const errorMessage = getErrorMessage(error);
  const extractedCode = extractErrorCode(error);
  
  // If error already has a valid ErrorCode, use it directly
  if (extractedCode) {
    const info = getErrorInfo(extractedCode);
    return {
      userMessage: info.userMessage,
      technicalDetails: errorMessage,
      code: extractedCode,
      actionable: info.resolution,
      shouldReport: info.shouldReport,
    };
  }

  // Otherwise, detect category and map to appropriate error code
  let detectedCode: ErrorCode;

  // Wallet errors
  if (category === "wallet" || isWalletError(errorMessage)) {
    detectedCode = mapWalletErrorToCode(errorMessage);
  }
  // Network errors
  else if (category === "network" || isNetworkError(errorMessage)) {
    detectedCode = mapNetworkErrorToCode(errorMessage);
  }
  // Account errors
  else if (category === "account" || isAccountError(errorMessage)) {
    detectedCode = mapAccountErrorToCode(errorMessage);
  }
  // Transaction errors
  else if (category === "transaction" || isTransactionError(errorMessage)) {
    detectedCode = mapTransactionErrorToCode(errorMessage);
  }
  // Stellar/Soroban errors
  else if (category === "stellar" || category === "soroban" || isStellarError(errorMessage)) {
    detectedCode = mapStellarErrorToCode(errorMessage);
  }
  // Storage errors
  else if (category === "storage" || isStorageError(errorMessage)) {
    detectedCode = mapStorageErrorToCode(errorMessage);
  }
  // Fallback to unknown
  else {
    detectedCode = ErrorCode.UNKNOWN_ERROR;
  }

  const info = getErrorInfo(detectedCode);
  return {
    userMessage: info.userMessage,
    technicalDetails: errorMessage,
    code: detectedCode,
    actionable: info.resolution,
    shouldReport: info.shouldReport,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Unknown error";
}

function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    if ("code" in error) return String(error.code);
    if ("name" in error) return String(error.name);
  }
  return undefined;
}

// ============================================================================
// Category Detection (legacy - kept for backward compatibility)
// ============================================================================

function isWalletError(message: string): boolean {
  const walletKeywords = [
    "freighter",
    "extension",
    "wallet",
    "user rejected",
    "user denied",
    "not installed",
    "not found",
    "locked",
  ];
  return walletKeywords.some((keyword) =>
    message.toLowerCase().includes(keyword)
  );
}

function isNetworkError(message: string): boolean {
  const networkKeywords = [
    "network",
    "timeout",
    "fetch",
    "connection",
    "offline",
    "ECONNREFUSED",
    "ERR_NETWORK",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNRESET",
  ];
  return networkKeywords.some((keyword) => message.toLowerCase().includes(keyword));
}

function isAccountError(message: string): boolean {
  const accountKeywords = [
    "account not found",
    "account does not exist",
    "no account",
    "unfunded",
    "insufficient balance",
    "op_underfunded",
  ];
  return accountKeywords.some((keyword) =>
    message.toLowerCase().includes(keyword)
  );
}

function isTransactionError(message: string): boolean {
  const txKeywords = [
    "transaction",
    "tx_failed",
    "tx_bad_seq",
    "tx_insufficient_fee",
    "op_failed",
  ];
  return txKeywords.some((keyword) => message.toLowerCase().includes(keyword));
}

function isStellarError(message: string): boolean {
  const stellarKeywords = [
    "stellar",
    "horizon",
    "soroban",
    "xlm",
    "stroop",
    "op_",
    "tx_",
  ];
  return stellarKeywords.some((keyword) =>
    message.toLowerCase().includes(keyword)
  );
}

function isStorageError(message: string): boolean {
  const storageKeywords = [
    "storage",
    "localstorage",
    "quota",
    "exceeded",
    "idb",
    "indexeddb",
  ];
  return storageKeywords.some((keyword) =>
    message.toLowerCase().includes(keyword)
  );
}

// ============================================================================
// Category-to-ErrorCode Mappers
// ============================================================================

function mapWalletErrorToCode(message: string): ErrorCode {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("user rejected") || lowerMessage.includes("user denied")) {
    return ErrorCode.WALLET_USER_REJECTED;
  }
  if (lowerMessage.includes("not installed") || lowerMessage.includes("not found")) {
    return ErrorCode.WALLET_NOT_INSTALLED;
  }
  if (lowerMessage.includes("locked")) {
    return ErrorCode.WALLET_LOCKED;
  }
  if (lowerMessage.includes("extension")) {
    return ErrorCode.WALLET_EXTENSION_ERROR;
  }
  if (lowerMessage.includes("network") && lowerMessage.includes("mismatch")) {
    return ErrorCode.WALLET_NETWORK_MISMATCH;
  }

  return ErrorCode.WALLET_CONNECTION_FAILED;
}

function mapNetworkErrorToCode(message: string): ErrorCode {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("timeout") || lowerMessage.includes("etimedout")) {
    return ErrorCode.NETWORK_TIMEOUT;
  }
  if (lowerMessage.includes("offline") || lowerMessage.includes("not connected")) {
    return ErrorCode.NETWORK_OFFLINE;
  }
  if (lowerMessage.includes("econnrefused") || lowerMessage.includes("connection refused")) {
    return ErrorCode.NETWORK_CONNECTION_REFUSED;
  }

  return ErrorCode.NETWORK_REQUEST_FAILED;
}

function mapAccountErrorToCode(message: string): ErrorCode {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("account not found") || lowerMessage.includes("does not exist")) {
    return ErrorCode.ACCOUNT_NOT_FOUND;
  }
  if (lowerMessage.includes("unfunded") || lowerMessage.includes("not funded")) {
    return ErrorCode.ACCOUNT_UNFUNDED;
  }
  if (lowerMessage.includes("insufficient balance") || lowerMessage.includes("op_underfunded")) {
    return ErrorCode.ACCOUNT_INSUFFICIENT_BALANCE;
  }
  if (lowerMessage.includes("invalid") && lowerMessage.includes("address")) {
    return ErrorCode.ACCOUNT_INVALID_ADDRESS;
  }

  return ErrorCode.ACCOUNT_NOT_FOUND;
}

function mapTransactionErrorToCode(message: string): ErrorCode {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("tx_bad_seq") || lowerMessage.includes("bad sequence")) {
    return ErrorCode.TRANSACTION_BAD_SEQUENCE;
  }
  if (lowerMessage.includes("tx_insufficient_fee") || lowerMessage.includes("fee too low")) {
    return ErrorCode.TRANSACTION_INSUFFICIENT_FEE;
  }
  if (lowerMessage.includes("timeout")) {
    return ErrorCode.TRANSACTION_TIMEOUT;
  }
  if (lowerMessage.includes("invalid")) {
    return ErrorCode.TRANSACTION_INVALID;
  }

  return ErrorCode.TRANSACTION_FAILED;
}

function mapStellarErrorToCode(message: string): ErrorCode {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("horizon")) {
    return ErrorCode.STELLAR_HORIZON_ERROR;
  }
  if (lowerMessage.includes("rpc")) {
    return ErrorCode.STELLAR_RPC_ERROR;
  }
  if (lowerMessage.includes("soroban") || lowerMessage.includes("contract")) {
    return ErrorCode.SOROBAN_CONTRACT_ERROR;
  }
  if (lowerMessage.includes("invocation") || lowerMessage.includes("invoke")) {
    return ErrorCode.SOROBAN_INVOCATION_FAILED;
  }

  return ErrorCode.STELLAR_NETWORK_ERROR;
}

function mapStorageErrorToCode(message: string): ErrorCode {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("quota") || lowerMessage.includes("exceeded")) {
    return ErrorCode.STORAGE_QUOTA_EXCEEDED;
  }
  if (lowerMessage.includes("decrypt")) {
    return ErrorCode.STORAGE_DECRYPTION_FAILED;
  }
  if (lowerMessage.includes("read")) {
    return ErrorCode.STORAGE_READ_FAILED;
  }
  if (lowerMessage.includes("write") || lowerMessage.includes("save")) {
    return ErrorCode.STORAGE_WRITE_FAILED;
  }
  if (lowerMessage.includes("unavailable") || lowerMessage.includes("disabled")) {
    return ErrorCode.STORAGE_UNAVAILABLE;
  }

  return ErrorCode.STORAGE_WRITE_FAILED;
}

/**
 * Simple wrapper to get just the user-friendly message
 */
export function getUserFriendlyMessage(error: unknown, category?: ErrorCategory): string {
  return mapError(error, category).userMessage;
}

/**
 * Check if error should be displayed to users in production
 */
export function shouldDisplayError(error: MappedError): boolean {
  // Always display mapped errors to users
  return true;
}

/**
 * Format error for logging/debugging
 */
export function formatErrorForLogging(error: unknown): string {
  const mapped = mapError(error);
  return `[${mapped.code}] ${mapped.userMessage}\nTechnical: ${mapped.technicalDetails || "N/A"}\nResolution: ${mapped.actionable || "N/A"}`;
}

/**
 * Create an Error object with an ErrorCode attached.
 * Useful for throwing typed errors that will be properly mapped.
 * 
 * @example
 * throw createErrorWithCode(ErrorCode.WALLET_NOT_INSTALLED, "Freighter not detected");
 */
export function createErrorWithCode(code: ErrorCode, message?: string): Error {
  const info = getErrorInfo(code);
  const error = new Error(message || info.userMessage);
  (error as any).code = code;
  return error;
}

// Re-export error code types and utilities for convenience
export { ErrorCode, ERROR_CODE_REGISTRY, getErrorInfo, extractErrorCode } from "@/constants/error-codes";
export type { ErrorCodeInfo } from "@/constants/error-codes";
