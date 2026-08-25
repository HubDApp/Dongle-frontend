/**
 * Network Guard Utilities
 * 
 * Helpers to prevent network-dependent actions when offline
 */

export interface NetworkAction {
  name: string;
  requiresNetwork: boolean;
  offlineMessage?: string;
}

/**
 * Check if action should be blocked when offline
 */
export function shouldBlockAction(
  isOnline: boolean,
  action: NetworkAction
): { blocked: boolean; reason?: string } {
  if (!action.requiresNetwork) {
    return { blocked: false };
  }

  if (!isOnline) {
    return {
      blocked: true,
      reason: action.offlineMessage || `${action.name} requires an internet connection`,
    };
  }

  return { blocked: false };
}

/**
 * Network-dependent actions in the app
 */
export const NETWORK_ACTIONS = {
  WALLET_CONNECT: {
    name: "Connect Wallet",
    requiresNetwork: true,
    offlineMessage: "Cannot connect wallet while offline. Please check your internet connection.",
  },
  WALLET_TRANSACTION: {
    name: "Submit Transaction",
    requiresNetwork: true,
    offlineMessage: "Cannot submit transactions while offline. Please restore your internet connection.",
  },
  PROJECT_SUBMIT: {
    name: "Submit Project",
    requiresNetwork: true,
    offlineMessage: "Cannot submit project while offline. Your changes will be lost.",
  },
  REVIEW_SUBMIT: {
    name: "Submit Review",
    requiresNetwork: true,
    offlineMessage: "Cannot submit review while offline. Please save your draft.",
  },
  VERIFICATION_REQUEST: {
    name: "Request Verification",
    requiresNetwork: true,
    offlineMessage: "Cannot request verification while offline. This requires blockchain interaction.",
  },
  LOAD_PROJECTS: {
    name: "Load Projects",
    requiresNetwork: false, // Can use cached data
  },
  VIEW_PROJECT: {
    name: "View Project",
    requiresNetwork: false, // Can use cached data
  },
  BROWSE_REVIEWS: {
    name: "Browse Reviews",
    requiresNetwork: false, // Can use cached data
  },
} as const;

/**
 * Wrapper for async functions that require network
 * 
 * @example
 * ```tsx
 * const handleSubmit = withNetworkGuard(
 *   isOnline,
 *   NETWORK_ACTIONS.REVIEW_SUBMIT,
 *   async () => {
 *     await submitReview(data);
 *   }
 * );
 * ```
 */
export function withNetworkGuard<T>(
  isOnline: boolean,
  action: NetworkAction,
  fn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const { blocked, reason } = shouldBlockAction(isOnline, action);

    if (blocked) {
      throw new Error(reason);
    }

    return fn();
  };
}

/**
 * Check if fetch request failed due to network
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Fetch throws TypeError for network errors
    return error.message.includes("Failed to fetch") ||
           error.message.includes("Network request failed") ||
           error.message.includes("NetworkError");
  }

  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    return code === "NETWORK_ERROR" ||
           code === "ECONNREFUSED" ||
           code === "ETIMEDOUT" ||
           code === "ENOTFOUND";
  }

  return false;
}

/**
 * Retry logic for network requests with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if not a network error
      if (!isNetworkError(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError;
}
