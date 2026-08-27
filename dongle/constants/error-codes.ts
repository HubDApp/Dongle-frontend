/**
 * Centralized Error Code Registry
 *
 * This module defines all error codes used throughout the Dongle application.
 * Each error code has a unique identifier, description, and suggested resolution.
 *
 * Usage:
 *   import { ErrorCode } from "@/constants/error-codes";
 *   throw new Error(ErrorCode.WALLET_NOT_INSTALLED);
 *
 * Benefits:
 *   • Type-safe error codes (no magic strings)
 *   • Centralized documentation
 *   • Easy to search and refactor
 *   • API responses include consistent error codes
 *   • Better error tracking and analytics
 */

// ============================================================================
// Error Code Enum
// ============================================================================

/**
 * Application-wide error codes.
 * 
 * Naming Convention:
 *   - UPPERCASE_SNAKE_CASE
 *   - Prefix indicates category (WALLET_, NETWORK_, STELLAR_, etc.)
 *   - Descriptive and specific
 * 
 * When adding new codes:
 *   1. Add the code to this enum
 *   2. Add documentation to ERROR_CODE_REGISTRY
 *   3. Update error-mapper to use the new code
 */
export const enum ErrorCode {
  // ── Wallet Errors (1xxx) ───────────────────────────────────────────────────
  WALLET_NOT_INSTALLED = "WALLET_NOT_INSTALLED",
  WALLET_LOCKED = "WALLET_LOCKED",
  WALLET_USER_REJECTED = "WALLET_USER_REJECTED",
  WALLET_CONNECTION_FAILED = "WALLET_CONNECTION_FAILED",
  WALLET_EXTENSION_ERROR = "WALLET_EXTENSION_ERROR",
  WALLET_NETWORK_MISMATCH = "WALLET_NETWORK_MISMATCH",
  
  // ── Network Errors (2xxx) ──────────────────────────────────────────────────
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
  NETWORK_OFFLINE = "NETWORK_OFFLINE",
  NETWORK_CONNECTION_REFUSED = "NETWORK_CONNECTION_REFUSED",
  NETWORK_REQUEST_FAILED = "NETWORK_REQUEST_FAILED",
  NETWORK_UNKNOWN_ERROR = "NETWORK_UNKNOWN_ERROR",
  
  // ── Account Errors (3xxx) ──────────────────────────────────────────────────
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  ACCOUNT_UNFUNDED = "ACCOUNT_UNFUNDED",
  ACCOUNT_INSUFFICIENT_BALANCE = "ACCOUNT_INSUFFICIENT_BALANCE",
  ACCOUNT_INVALID_ADDRESS = "ACCOUNT_INVALID_ADDRESS",
  
  // ── Transaction Errors (4xxx) ──────────────────────────────────────────────
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  TRANSACTION_BAD_SEQUENCE = "TRANSACTION_BAD_SEQUENCE",
  TRANSACTION_INSUFFICIENT_FEE = "TRANSACTION_INSUFFICIENT_FEE",
  TRANSACTION_TIMEOUT = "TRANSACTION_TIMEOUT",
  TRANSACTION_INVALID = "TRANSACTION_INVALID",
  
  // ── Stellar/Soroban Errors (5xxx) ──────────────────────────────────────────
  STELLAR_HORIZON_ERROR = "STELLAR_HORIZON_ERROR",
  STELLAR_RPC_ERROR = "STELLAR_RPC_ERROR",
  SOROBAN_CONTRACT_ERROR = "SOROBAN_CONTRACT_ERROR",
  SOROBAN_INVOCATION_FAILED = "SOROBAN_INVOCATION_FAILED",
  STELLAR_NETWORK_ERROR = "STELLAR_NETWORK_ERROR",
  
  // ── Storage Errors (6xxx) ──────────────────────────────────────────────────
  STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED",
  STORAGE_READ_FAILED = "STORAGE_READ_FAILED",
  STORAGE_WRITE_FAILED = "STORAGE_WRITE_FAILED",
  STORAGE_UNAVAILABLE = "STORAGE_UNAVAILABLE",
  STORAGE_DECRYPTION_FAILED = "STORAGE_DECRYPTION_FAILED",
  
  // ── Validation Errors (7xxx) ───────────────────────────────────────────────
  VALIDATION_INVALID_URL = "VALIDATION_INVALID_URL",
  VALIDATION_INVALID_CONTRACT_ID = "VALIDATION_INVALID_CONTRACT_ID",
  VALIDATION_INVALID_PUBLIC_KEY = "VALIDATION_INVALID_PUBLIC_KEY",
  VALIDATION_INVALID_REPOSITORY_URL = "VALIDATION_INVALID_REPOSITORY_URL",
  VALIDATION_REQUIRED_FIELD = "VALIDATION_REQUIRED_FIELD",
  VALIDATION_FIELD_TOO_LONG = "VALIDATION_FIELD_TOO_LONG",
  VALIDATION_FIELD_TOO_SHORT = "VALIDATION_FIELD_TOO_SHORT",
  
  // ── API Errors (8xxx) ──────────────────────────────────────────────────────
  API_NOT_FOUND = "API_NOT_FOUND",
  API_BAD_REQUEST = "API_BAD_REQUEST",
  API_UNAUTHORIZED = "API_UNAUTHORIZED",
  API_FORBIDDEN = "API_FORBIDDEN",
  API_SERVER_ERROR = "API_SERVER_ERROR",
  API_RATE_LIMITED = "API_RATE_LIMITED",
  
  // ── Draft Errors (9xxx) ────────────────────────────────────────────────────
  DRAFT_SAVE_FAILED = "DRAFT_SAVE_FAILED",
  DRAFT_LOAD_FAILED = "DRAFT_LOAD_FAILED",
  DRAFT_DELETE_FAILED = "DRAFT_DELETE_FAILED",
  DRAFT_NOT_FOUND = "DRAFT_NOT_FOUND",
  DRAFT_EXPIRED = "DRAFT_EXPIRED",
  
  // ── Contract/Project Errors (10xxx) ────────────────────────────────────────
  PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND",
  PROJECT_DUPLICATE = "PROJECT_DUPLICATE",
  PROJECT_INVALID_DATA = "PROJECT_INVALID_DATA",
  CONTRACT_NOT_DEPLOYED = "CONTRACT_NOT_DEPLOYED",
  CONTRACT_VALIDATION_FAILED = "CONTRACT_VALIDATION_FAILED",
  
  // ── Unknown/Generic Errors (99xxx) ─────────────────────────────────────────
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// ============================================================================
// Error Code Documentation
// ============================================================================

export interface ErrorCodeInfo {
  /** The error code identifier */
  code: ErrorCode;
  /** Human-readable error message for users */
  userMessage: string;
  /** Technical description for developers */
  description: string;
  /** Suggested resolution steps */
  resolution: string;
  /** Category for grouping related errors */
  category: "wallet" | "network" | "account" | "transaction" | "stellar" | "storage" | "validation" | "api" | "draft" | "project" | "unknown";
  /** HTTP status code (if applicable to API errors) */
  httpStatus?: number;
  /** Whether this error should be reported to error tracking (Sentry) */
  shouldReport?: boolean;
}

/**
 * Comprehensive error code registry with documentation for each error.
 * 
 * This serves as the single source of truth for error handling across the app.
 */
export const ERROR_CODE_REGISTRY: Record<ErrorCode, ErrorCodeInfo> = {
  // ── Wallet Errors ──────────────────────────────────────────────────────────
  [ErrorCode.WALLET_NOT_INSTALLED]: {
    code: ErrorCode.WALLET_NOT_INSTALLED,
    userMessage: "Freighter wallet extension is not installed.",
    description: "User attempted to connect wallet but Freighter extension is not detected in browser.",
    resolution: "Install Freighter from Chrome Web Store or Firefox Add-ons, then refresh the page.",
    category: "wallet",
    shouldReport: false,
  },
  
  [ErrorCode.WALLET_LOCKED]: {
    code: ErrorCode.WALLET_LOCKED,
    userMessage: "Your wallet is locked.",
    description: "Freighter extension is installed but the wallet is locked with a password.",
    resolution: "Unlock Freighter and try again.",
    category: "wallet",
    shouldReport: false,
  },
  
  [ErrorCode.WALLET_USER_REJECTED]: {
    code: ErrorCode.WALLET_USER_REJECTED,
    userMessage: "Transaction was cancelled. No action was taken.",
    description: "User explicitly rejected or cancelled the transaction in Freighter.",
    resolution: "Try again and approve the transaction in Freighter when prompted.",
    category: "wallet",
    shouldReport: false,
  },
  
  [ErrorCode.WALLET_CONNECTION_FAILED]: {
    code: ErrorCode.WALLET_CONNECTION_FAILED,
    userMessage: "Failed to connect to your wallet.",
    description: "Connection attempt to Freighter failed for unknown reason.",
    resolution: "Check that Freighter is installed and enabled. Try refreshing the page.",
    category: "wallet",
    shouldReport: true,
  },
  
  [ErrorCode.WALLET_EXTENSION_ERROR]: {
    code: ErrorCode.WALLET_EXTENSION_ERROR,
    userMessage: "There was a problem with your wallet extension.",
    description: "Freighter extension threw an unexpected error.",
    resolution: "Try restarting your browser or reinstalling Freighter.",
    category: "wallet",
    shouldReport: true,
  },
  
  [ErrorCode.WALLET_NETWORK_MISMATCH]: {
    code: ErrorCode.WALLET_NETWORK_MISMATCH,
    userMessage: "Your wallet is connected to a different network.",
    description: "Freighter network setting does not match the app's configured network.",
    resolution: "Switch Freighter to the correct network (testnet or mainnet) and refresh.",
    category: "wallet",
    shouldReport: false,
  },
  
  // ── Network Errors ─────────────────────────────────────────────────────────
  [ErrorCode.NETWORK_TIMEOUT]: {
    code: ErrorCode.NETWORK_TIMEOUT,
    userMessage: "The request timed out. The network may be slow or unavailable.",
    description: "Network request exceeded timeout limit.",
    resolution: "Check your internet connection and try again. If problem persists, the service may be temporarily down.",
    category: "network",
    shouldReport: true,
  },
  
  [ErrorCode.NETWORK_OFFLINE]: {
    code: ErrorCode.NETWORK_OFFLINE,
    userMessage: "You appear to be offline.",
    description: "Browser navigator reports no network connection.",
    resolution: "Check your internet connection and try again.",
    category: "network",
    shouldReport: false,
  },
  
  [ErrorCode.NETWORK_CONNECTION_REFUSED]: {
    code: ErrorCode.NETWORK_CONNECTION_REFUSED,
    userMessage: "Unable to connect to the Stellar network.",
    description: "Connection to RPC/Horizon server was refused.",
    resolution: "The service may be temporarily unavailable. Try again later.",
    category: "network",
    shouldReport: true,
  },
  
  [ErrorCode.NETWORK_REQUEST_FAILED]: {
    code: ErrorCode.NETWORK_REQUEST_FAILED,
    userMessage: "Network request failed.",
    description: "HTTP request failed with network error (not a response error).",
    resolution: "Check your internet connection and try again.",
    category: "network",
    shouldReport: true,
  },
  
  [ErrorCode.NETWORK_UNKNOWN_ERROR]: {
    code: ErrorCode.NETWORK_UNKNOWN_ERROR,
    userMessage: "A network error occurred.",
    description: "Unclassified network error.",
    resolution: "Check your internet connection. If problem persists, contact support.",
    category: "network",
    shouldReport: true,
  },
  
  // ── Account Errors ─────────────────────────────────────────────────────────
  [ErrorCode.ACCOUNT_NOT_FOUND]: {
    code: ErrorCode.ACCOUNT_NOT_FOUND,
    userMessage: "This account does not exist on the Stellar network.",
    description: "Stellar account lookup returned 404 or account not found error.",
    resolution: "The account may need to be funded with at least 1 XLM to activate it. Use Stellar Friendbot for testnet.",
    category: "account",
    shouldReport: false,
  },
  
  [ErrorCode.ACCOUNT_UNFUNDED]: {
    code: ErrorCode.ACCOUNT_UNFUNDED,
    userMessage: "This account has not been funded yet.",
    description: "Account exists in Freighter but has never been funded on the network.",
    resolution: "Send at least 1 XLM to this account to activate it. Use Friendbot for testnet: https://friendbot.stellar.org/",
    category: "account",
    shouldReport: false,
  },
  
  [ErrorCode.ACCOUNT_INSUFFICIENT_BALANCE]: {
    code: ErrorCode.ACCOUNT_INSUFFICIENT_BALANCE,
    userMessage: "Insufficient balance to complete this transaction.",
    description: "Account balance is too low to cover transaction fees and minimum balance requirements.",
    resolution: "Add more XLM to your account. Ensure you maintain the minimum balance (2 XLM base reserve).",
    category: "account",
    shouldReport: false,
  },
  
  [ErrorCode.ACCOUNT_INVALID_ADDRESS]: {
    code: ErrorCode.ACCOUNT_INVALID_ADDRESS,
    userMessage: "Invalid Stellar account address.",
    description: "Provided address does not match Stellar public key format (G + 55 base32 characters).",
    resolution: "Verify the address format. Stellar public keys start with 'G' and are 56 characters long.",
    category: "account",
    shouldReport: false,
  },
  
  // ── Transaction Errors ─────────────────────────────────────────────────────
  [ErrorCode.TRANSACTION_FAILED]: {
    code: ErrorCode.TRANSACTION_FAILED,
    userMessage: "Transaction failed to process.",
    description: "Transaction was submitted but failed during execution.",
    resolution: "Check the transaction details and try again. Ensure all parameters are correct.",
    category: "transaction",
    shouldReport: true,
  },
  
  [ErrorCode.TRANSACTION_BAD_SEQUENCE]: {
    code: ErrorCode.TRANSACTION_BAD_SEQUENCE,
    userMessage: "Transaction sequence number is incorrect.",
    description: "Transaction sequence number does not match the account's current sequence.",
    resolution: "Refresh the page and try again. This usually happens when multiple transactions are submitted simultaneously.",
    category: "transaction",
    shouldReport: false,
  },
  
  [ErrorCode.TRANSACTION_INSUFFICIENT_FEE]: {
    code: ErrorCode.TRANSACTION_INSUFFICIENT_FEE,
    userMessage: "Transaction fee is too low.",
    description: "Network rejected transaction because fee is below minimum required.",
    resolution: "Try again. The app will automatically calculate a higher fee.",
    category: "transaction",
    shouldReport: false,
  },
  
  [ErrorCode.TRANSACTION_TIMEOUT]: {
    code: ErrorCode.TRANSACTION_TIMEOUT,
    userMessage: "Transaction timed out waiting for confirmation.",
    description: "Transaction was submitted but did not confirm within expected time.",
    resolution: "Check Stellar Explorer to see if transaction was processed. Try again if not found.",
    category: "transaction",
    shouldReport: true,
  },
  
  [ErrorCode.TRANSACTION_INVALID]: {
    code: ErrorCode.TRANSACTION_INVALID,
    userMessage: "Transaction is invalid.",
    description: "Transaction validation failed before submission.",
    resolution: "Verify all transaction parameters are correct and try again.",
    category: "transaction",
    shouldReport: true,
  },
  
  // ── Stellar/Soroban Errors ─────────────────────────────────────────────────
  [ErrorCode.STELLAR_HORIZON_ERROR]: {
    code: ErrorCode.STELLAR_HORIZON_ERROR,
    userMessage: "Unable to connect to the Stellar network.",
    description: "Horizon server returned an error or is unavailable.",
    resolution: "The Stellar Horizon server may be experiencing issues. Check https://status.stellar.org/ and try again later.",
    category: "stellar",
    shouldReport: true,
  },
  
  [ErrorCode.STELLAR_RPC_ERROR]: {
    code: ErrorCode.STELLAR_RPC_ERROR,
    userMessage: "Stellar RPC request failed.",
    description: "Soroban RPC endpoint returned an error.",
    resolution: "Check RPC endpoint configuration and network status. Try again later.",
    category: "stellar",
    shouldReport: true,
  },
  
  [ErrorCode.SOROBAN_CONTRACT_ERROR]: {
    code: ErrorCode.SOROBAN_CONTRACT_ERROR,
    userMessage: "Smart contract operation failed.",
    description: "Contract invocation threw an error or reverted.",
    resolution: "The smart contract rejected this operation. Verify input parameters and try again.",
    category: "stellar",
    shouldReport: true,
  },
  
  [ErrorCode.SOROBAN_INVOCATION_FAILED]: {
    code: ErrorCode.SOROBAN_INVOCATION_FAILED,
    userMessage: "Failed to invoke smart contract.",
    description: "Contract invocation failed before execution (e.g., invalid parameters, contract not found).",
    resolution: "Verify contract address and parameters. Check contract is deployed on current network.",
    category: "stellar",
    shouldReport: true,
  },
  
  [ErrorCode.STELLAR_NETWORK_ERROR]: {
    code: ErrorCode.STELLAR_NETWORK_ERROR,
    userMessage: "A Stellar network error occurred.",
    description: "Unspecified Stellar network error.",
    resolution: "Check network status and try again. If problem persists, contact support.",
    category: "stellar",
    shouldReport: true,
  },
  
  // ── Storage Errors ─────────────────────────────────────────────────────────
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: {
    code: ErrorCode.STORAGE_QUOTA_EXCEEDED,
    userMessage: "Browser storage limit reached.",
    description: "localStorage or IndexedDB quota exceeded.",
    resolution: "Clear some browser data (Settings → Privacy → Clear browsing data) or use a different browser.",
    category: "storage",
    shouldReport: false,
  },
  
  [ErrorCode.STORAGE_READ_FAILED]: {
    code: ErrorCode.STORAGE_READ_FAILED,
    userMessage: "Failed to read data from local storage.",
    description: "Error reading from localStorage/IndexedDB.",
    resolution: "Check browser settings allow storage. Try refreshing the page.",
    category: "storage",
    shouldReport: true,
  },
  
  [ErrorCode.STORAGE_WRITE_FAILED]: {
    code: ErrorCode.STORAGE_WRITE_FAILED,
    userMessage: "Failed to save data locally.",
    description: "Error writing to localStorage/IndexedDB.",
    resolution: "Check browser settings and available storage space. Try clearing old data.",
    category: "storage",
    shouldReport: true,
  },
  
  [ErrorCode.STORAGE_UNAVAILABLE]: {
    code: ErrorCode.STORAGE_UNAVAILABLE,
    userMessage: "Local storage is not available.",
    description: "localStorage/IndexedDB is disabled or unavailable (private browsing, browser settings).",
    resolution: "Enable storage in browser settings or exit private browsing mode.",
    category: "storage",
    shouldReport: false,
  },
  
  [ErrorCode.STORAGE_DECRYPTION_FAILED]: {
    code: ErrorCode.STORAGE_DECRYPTION_FAILED,
    userMessage: "Failed to decrypt stored data.",
    description: "Encrypted localStorage data could not be decrypted (wrong key or corrupted data).",
    resolution: "Try reconnecting your wallet. If problem persists, clear app data and start fresh.",
    category: "storage",
    shouldReport: true,
  },
  
  // ── Validation Errors ──────────────────────────────────────────────────────
  [ErrorCode.VALIDATION_INVALID_URL]: {
    code: ErrorCode.VALIDATION_INVALID_URL,
    userMessage: "Please enter a valid URL.",
    description: "URL format validation failed.",
    resolution: "Ensure URL includes protocol (https://) and is properly formatted.",
    category: "validation",
    httpStatus: 400,
    shouldReport: false,
  },
  
  [ErrorCode.VALIDATION_INVALID_CONTRACT_ID]: {
    code: ErrorCode.VALIDATION_INVALID_CONTRACT_ID,
    userMessage: "Invalid Soroban contract ID. Must be 56 characters starting with 'C'.",
    description: "Contract ID does not match required format (C + 55 base32 characters).",
    resolution: "Verify contract ID format. Example: CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PJUXEMKKHRXL",
    category: "validation",
    httpStatus: 400,
    shouldReport: false,
  },
  
  [ErrorCode.VALIDATION_INVALID_PUBLIC_KEY]: {
    code: ErrorCode.VALIDATION_INVALID_PUBLIC_KEY,
    userMessage: "Invalid Stellar public key. Must be 56 characters starting with 'G'.",
    description: "Public key does not match required format (G + 55 base32 characters).",
    resolution: "Verify public key format. Example: GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
    category: "validation",
    httpStatus: 400,
    shouldReport: false,
  },
  
  [ErrorCode.VALIDATION_INVALID_REPOSITORY_URL]: {
    code: ErrorCode.VALIDATION_INVALID_REPOSITORY_URL,
    userMessage: "Invalid repository URL.",
    description: "Repository URL is not a valid GitHub, GitLab, or Bitbucket URL.",
    resolution: "Use a valid repository URL format: https://github.com/user/repo",
    category: "validation",
    httpStatus: 400,
    shouldReport: false,
  },
  
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: {
    code: ErrorCode.VALIDATION_REQUIRED_FIELD,
    userMessage: "This field is required.",
    description: "Required form field is empty or missing.",
    resolution: "Fill in all required fields marked with *.",
    category: "validation",
    httpStatus: 400,
    shouldReport: false,
  },
  
  [ErrorCode.VALIDATION_FIELD_TOO_LONG]: {
    code: ErrorCode.VALIDATION_FIELD_TOO_LONG,
    userMessage: "This field exceeds the maximum length.",
    description: "Field value exceeds maximum allowed characters.",
    resolution: "Shorten the input to meet character limit.",
    category: "validation",
    httpStatus: 400,
    shouldReport: false,
  },
  
  [ErrorCode.VALIDATION_FIELD_TOO_SHORT]: {
    code: ErrorCode.VALIDATION_FIELD_TOO_SHORT,
    userMessage: "This field is too short.",
    description: "Field value does not meet minimum character requirement.",
    resolution: "Provide more detail to meet minimum length.",
    category: "validation",
    httpStatus: 400,
    shouldReport: false,
  },
  
  // ── API Errors ─────────────────────────────────────────────────────────────
  [ErrorCode.API_NOT_FOUND]: {
    code: ErrorCode.API_NOT_FOUND,
    userMessage: "The requested resource was not found.",
    description: "API endpoint returned 404.",
    resolution: "Verify the resource exists and the URL is correct.",
    category: "api",
    httpStatus: 404,
    shouldReport: false,
  },
  
  [ErrorCode.API_BAD_REQUEST]: {
    code: ErrorCode.API_BAD_REQUEST,
    userMessage: "Invalid request.",
    description: "API endpoint returned 400 due to invalid request data.",
    resolution: "Check request parameters and try again.",
    category: "api",
    httpStatus: 400,
    shouldReport: false,
  },
  
  [ErrorCode.API_UNAUTHORIZED]: {
    code: ErrorCode.API_UNAUTHORIZED,
    userMessage: "Authentication required.",
    description: "API endpoint requires authentication (401).",
    resolution: "Connect your wallet and try again.",
    category: "api",
    httpStatus: 401,
    shouldReport: false,
  },
  
  [ErrorCode.API_FORBIDDEN]: {
    code: ErrorCode.API_FORBIDDEN,
    userMessage: "You do not have permission to access this resource.",
    description: "API endpoint returned 403 forbidden.",
    resolution: "Verify you have the required permissions. Contact admin if needed.",
    category: "api",
    httpStatus: 403,
    shouldReport: false,
  },
  
  [ErrorCode.API_SERVER_ERROR]: {
    code: ErrorCode.API_SERVER_ERROR,
    userMessage: "Server error. Please try again later.",
    description: "API endpoint returned 500 internal server error.",
    resolution: "The server encountered an error. Try again later or contact support if problem persists.",
    category: "api",
    httpStatus: 500,
    shouldReport: true,
  },
  
  [ErrorCode.API_RATE_LIMITED]: {
    code: ErrorCode.API_RATE_LIMITED,
    userMessage: "Too many requests. Please slow down.",
    description: "API rate limit exceeded (429).",
    resolution: "Wait a moment before making another request.",
    category: "api",
    httpStatus: 429,
    shouldReport: false,
  },
  
  // ── Draft Errors ───────────────────────────────────────────────────────────
  [ErrorCode.DRAFT_SAVE_FAILED]: {
    code: ErrorCode.DRAFT_SAVE_FAILED,
    userMessage: "Failed to save draft.",
    description: "Draft save operation failed (localStorage or API error).",
    resolution: "Check your internet connection and storage space. Draft may have been saved locally.",
    category: "draft",
    shouldReport: true,
  },
  
  [ErrorCode.DRAFT_LOAD_FAILED]: {
    code: ErrorCode.DRAFT_LOAD_FAILED,
    userMessage: "Failed to load draft.",
    description: "Draft retrieval failed (localStorage or API error).",
    resolution: "Try refreshing the page. If problem persists, draft may be corrupted.",
    category: "draft",
    shouldReport: true,
  },
  
  [ErrorCode.DRAFT_DELETE_FAILED]: {
    code: ErrorCode.DRAFT_DELETE_FAILED,
    userMessage: "Failed to delete draft.",
    description: "Draft deletion failed.",
    resolution: "Try again. You can also clear browser data to remove all drafts.",
    category: "draft",
    shouldReport: true,
  },
  
  [ErrorCode.DRAFT_NOT_FOUND]: {
    code: ErrorCode.DRAFT_NOT_FOUND,
    userMessage: "Draft not found.",
    description: "Requested draft does not exist (404).",
    resolution: "The draft may have expired (30-day limit) or been deleted.",
    category: "draft",
    httpStatus: 404,
    shouldReport: false,
  },
  
  [ErrorCode.DRAFT_EXPIRED]: {
    code: ErrorCode.DRAFT_EXPIRED,
    userMessage: "This draft has expired.",
    description: "Draft exceeded 30-day TTL and was automatically deleted.",
    resolution: "Start a new submission. Drafts are kept for 30 days.",
    category: "draft",
    shouldReport: false,
  },
  
  // ── Contract/Project Errors ────────────────────────────────────────────────
  [ErrorCode.PROJECT_NOT_FOUND]: {
    code: ErrorCode.PROJECT_NOT_FOUND,
    userMessage: "Project not found.",
    description: "Requested project does not exist on-chain or in cache.",
    resolution: "Verify the project ID is correct. Project may have been removed.",
    category: "project",
    httpStatus: 404,
    shouldReport: false,
  },
  
  [ErrorCode.PROJECT_DUPLICATE]: {
    code: ErrorCode.PROJECT_DUPLICATE,
    userMessage: "A project with this name or ID already exists.",
    description: "Attempted to register a duplicate project.",
    resolution: "Choose a different project name or update the existing project.",
    category: "project",
    shouldReport: false,
  },
  
  [ErrorCode.PROJECT_INVALID_DATA]: {
    code: ErrorCode.PROJECT_INVALID_DATA,
    userMessage: "Project data is invalid.",
    description: "Project validation failed (missing required fields, invalid format).",
    resolution: "Check all required fields are filled correctly and try again.",
    category: "project",
    httpStatus: 400,
    shouldReport: false,
  },
  
  [ErrorCode.CONTRACT_NOT_DEPLOYED]: {
    code: ErrorCode.CONTRACT_NOT_DEPLOYED,
    userMessage: "Contract is not deployed on this network.",
    description: "Contract ID is valid format but contract does not exist on the network.",
    resolution: "Verify contract is deployed on the correct network (testnet vs mainnet). Check contract ID is correct.",
    category: "project",
    shouldReport: false,
  },
  
  [ErrorCode.CONTRACT_VALIDATION_FAILED]: {
    code: ErrorCode.CONTRACT_VALIDATION_FAILED,
    userMessage: "Contract validation failed.",
    description: "Contract exists but validation checks failed (wrong interface, incompatible version).",
    resolution: "Ensure contract implements the expected interface. Contact support if you believe this is an error.",
    category: "project",
    shouldReport: true,
  },
  
  // ── Unknown Errors ─────────────────────────────────────────────────────────
  [ErrorCode.UNKNOWN_ERROR]: {
    code: ErrorCode.UNKNOWN_ERROR,
    userMessage: "An unexpected error occurred. Please try again.",
    description: "Unhandled or unknown error type.",
    resolution: "If the problem persists, please contact support with error details.",
    category: "unknown",
    shouldReport: true,
  },
  
  [ErrorCode.INTERNAL_ERROR]: {
    code: ErrorCode.INTERNAL_ERROR,
    userMessage: "Internal application error.",
    description: "Application logic error or unexpected state.",
    resolution: "Try refreshing the page. Contact support if problem persists.",
    category: "unknown",
    httpStatus: 500,
    shouldReport: true,
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get error information by code.
 * Returns default unknown error info if code not found.
 */
export function getErrorInfo(code: ErrorCode): ErrorCodeInfo {
  return ERROR_CODE_REGISTRY[code] || ERROR_CODE_REGISTRY[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Get all error codes for a specific category.
 */
export function getErrorCodesByCategory(
  category: ErrorCodeInfo["category"]
): ErrorCode[] {
  return Object.values(ErrorCode).filter(
    (code) => ERROR_CODE_REGISTRY[code as ErrorCode]?.category === category
  ) as ErrorCode[];
}

/**
 * Check if an error code should be reported to error tracking.
 */
export function shouldReportError(code: ErrorCode): boolean {
  return ERROR_CODE_REGISTRY[code]?.shouldReport ?? true;
}

/**
 * Get HTTP status code for an error code (if applicable).
 */
export function getHttpStatus(code: ErrorCode): number | undefined {
  return ERROR_CODE_REGISTRY[code]?.httpStatus;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a string is a valid ErrorCode.
 */
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && value in ERROR_CODE_REGISTRY;
}

/**
 * Extract error code from an error object.
 * Checks common error properties: code, name, errorCode.
 */
export function extractErrorCode(error: unknown): ErrorCode | null {
  if (!error || typeof error !== "object") return null;
  
  const codeProperties = ["code", "name", "errorCode"] as const;
  
  for (const prop of codeProperties) {
    if (prop in error) {
      const value = (error as Record<string, unknown>)[prop];
      if (isErrorCode(value)) {
        return value;
      }
    }
  }
  
  return null;
}
