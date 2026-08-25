/**
 * Error Mapper for Stellar, Soroban, Wallet, and Storage Operations
 * Converts technical errors into user-friendly messages while preserving developer diagnostics
 */

export interface MappedError {
  userMessage: string;
  technicalDetails?: string;
  code?: string;
  actionable?: string;
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
 * Maps technical error messages to user-friendly messages
 */
export function mapError(error: unknown, category?: ErrorCategory): MappedError {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);

  // Wallet errors
  if (category === "wallet" || isWalletError(errorMessage, errorCode)) {
    return mapWalletError(errorMessage, errorCode, error);
  }

  // Network errors
  if (category === "network" || isNetworkError(errorMessage, errorCode)) {
    return mapNetworkError(errorMessage, errorCode, error);
  }

  // Account errors
  if (category === "account" || isAccountError(errorMessage, errorCode)) {
    return mapAccountError(errorMessage, errorCode, error);
  }

  // Transaction errors
  if (category === "transaction" || isTransactionError(errorMessage, errorCode)) {
    return mapTransactionError(errorMessage, errorCode, error);
  }

  // Stellar/Soroban specific errors
  if (category === "stellar" || category === "soroban" || isStellarError(errorMessage, errorCode)) {
    return mapStellarError(errorMessage, errorCode, error);
  }

  // Storage errors
  if (category === "storage" || isStorageError(errorMessage, errorCode)) {
    return mapStorageError(errorMessage, errorCode, error);
  }

  // Fallback for unknown errors
  return {
    userMessage: "An unexpected error occurred. Please try again.",
    technicalDetails: errorMessage,
    code: errorCode,
    actionable: "If the problem persists, please contact support with the error details.",
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
// Category Detection
// ============================================================================

function isWalletError(message: string, code?: string): boolean {
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

function isNetworkError(message: string, code?: string): boolean {
  const networkKeywords = [
    "network",
    "timeout",
    "fetch",
    "connection",
    "offline",
    "ECONNREFUSED",
    "ERR_NETWORK",
  ];
  const networkCodes = ["ETIMEDOUT", "ENOTFOUND", "ECONNRESET"];
  return (
    networkKeywords.some((keyword) => message.toLowerCase().includes(keyword)) ||
    (code ? networkCodes.includes(code) : false)
  );
}

function isAccountError(message: string, code?: string): boolean {
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

function isTransactionError(message: string, code?: string): boolean {
  const txKeywords = [
    "transaction",
    "tx_failed",
    "tx_bad_seq",
    "tx_insufficient_fee",
    "op_failed",
  ];
  return txKeywords.some((keyword) => message.toLowerCase().includes(keyword));
}

function isStellarError(message: string, code?: string): boolean {
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

function isStorageError(message: string, code?: string): boolean {
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
// Category-Specific Mappers
// ============================================================================

function mapWalletError(
  message: string,
  code: string | undefined,
  originalError: unknown
): MappedError {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("user rejected") || lowerMessage.includes("user denied")) {
    return {
      userMessage: "Transaction was cancelled. No action was taken.",
      technicalDetails: message,
      code,
    };
  }

  if (lowerMessage.includes("not installed") || lowerMessage.includes("not found")) {
    return {
      userMessage: "Freighter wallet extension is not installed.",
      technicalDetails: message,
      code,
      actionable: "Please install Freighter from the Chrome Web Store or Firefox Add-ons.",
    };
  }

  if (lowerMessage.includes("locked")) {
    return {
      userMessage: "Your wallet is locked.",
      technicalDetails: message,
      code,
      actionable: "Please unlock Freighter and try again.",
    };
  }

  if (lowerMessage.includes("extension")) {
    return {
      userMessage: "There was a problem connecting to your wallet.",
      technicalDetails: message,
      code,
      actionable: "Please check that Freighter is installed and enabled.",
    };
  }

  return {
    userMessage: "Wallet connection failed.",
    technicalDetails: message,
    code,
    actionable: "Please check your wallet extension and try again.",
  };
}

function mapNetworkError(
  message: string,
  code: string | undefined,
  originalError: unknown
): MappedError {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("timeout") || code === "ETIMEDOUT") {
    return {
      userMessage: "The request timed out. The network may be slow or unavailable.",
      technicalDetails: message,
      code,
      actionable: "Please check your internet connection and try again.",
    };
  }

  if (lowerMessage.includes("offline") || lowerMessage.includes("not connected")) {
    return {
      userMessage: "You appear to be offline.",
      technicalDetails: message,
      code,
      actionable: "Please check your internet connection.",
    };
  }

  if (code === "ECONNREFUSED" || lowerMessage.includes("connection refused")) {
    return {
      userMessage: "Unable to connect to the Stellar network.",
      technicalDetails: message,
      code,
      actionable: "The service may be temporarily unavailable. Please try again later.",
    };
  }

  return {
    userMessage: "A network error occurred.",
    technicalDetails: message,
    code,
    actionable: "Please check your internet connection and try again.",
  };
}

function mapAccountError(
  message: string,
  code: string | undefined,
  originalError: unknown
): MappedError {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("account not found") ||
    lowerMessage.includes("does not exist")
  ) {
    return {
      userMessage: "This account does not exist on the Stellar network.",
      technicalDetails: message,
      code,
      actionable: "The account may need to be funded with at least 1 XLM to activate it.",
    };
  }

  if (lowerMessage.includes("unfunded") || lowerMessage.includes("not funded")) {
    return {
      userMessage: "This account has not been funded yet.",
      technicalDetails: message,
      code,
      actionable: "Send at least 1 XLM to this account to activate it.",
    };
  }

  if (
    lowerMessage.includes("insufficient balance") ||
    lowerMessage.includes("op_underfunded")
  ) {
    return {
      userMessage: "Insufficient balance to complete this transaction.",
      technicalDetails: message,
      code,
      actionable: "Please add more XLM to your account.",
    };
  }

  return {
    userMessage: "There was a problem with your account.",
    technicalDetails: message,
    code,
    actionable: "Please verify your account details and try again.",
  };
}

function mapTransactionError(
  message: string,
  code: string | undefined,
  originalError: unknown
): MappedError {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("tx_bad_seq")) {
    return {
      userMessage: "Transaction sequence number is incorrect.",
      technicalDetails: message,
      code,
      actionable: "Please refresh the page and try again.",
    };
  }

  if (lowerMessage.includes("tx_insufficient_fee")) {
    return {
      userMessage: "Transaction fee is too low.",
      technicalDetails: message,
      code,
      actionable: "Please try again with a higher fee.",
    };
  }

  if (lowerMessage.includes("tx_failed") || lowerMessage.includes("op_failed")) {
    return {
      userMessage: "Transaction failed to process.",
      technicalDetails: message,
      code,
      actionable: "Please check the transaction details and try again.",
    };
  }

  return {
    userMessage: "Transaction could not be completed.",
    technicalDetails: message,
    code,
    actionable: "Please try again or contact support if the issue persists.",
  };
}

function mapStellarError(
  message: string,
  code: string | undefined,
  originalError: unknown
): MappedError {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("horizon")) {
    return {
      userMessage: "Unable to connect to the Stellar network.",
      technicalDetails: message,
      code,
      actionable: "The Stellar Horizon server may be experiencing issues. Please try again later.",
    };
  }

  if (lowerMessage.includes("soroban")) {
    return {
      userMessage: "Smart contract operation failed.",
      technicalDetails: message,
      code,
      actionable: "There was an issue with the smart contract. Please try again.",
    };
  }

  return {
    userMessage: "A Stellar network error occurred.",
    technicalDetails: message,
    code,
    actionable: "Please try again later.",
  };
}

function mapStorageError(
  message: string,
  code: string | undefined,
  originalError: unknown
): MappedError {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("quota") || lowerMessage.includes("exceeded")) {
    return {
      userMessage: "Browser storage limit reached.",
      technicalDetails: message,
      code,
      actionable: "Please clear some browser data or use a different browser.",
    };
  }

  return {
    userMessage: "Failed to save data locally.",
    technicalDetails: message,
    code,
    actionable: "Please check your browser settings and available storage.",
  };
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
  return `User Message: ${mapped.userMessage}\nTechnical: ${mapped.technicalDetails || "N/A"}\nCode: ${mapped.code || "N/A"}`;
}
