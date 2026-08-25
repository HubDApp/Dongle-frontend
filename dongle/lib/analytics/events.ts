/**
 * Named helpers for core-journey analytics events.
 * Prefer these over calling `track()` with raw strings at call sites.
 */

import { track, withWalletFingerprint } from "./client";
import { bucketQueryLength } from "./privacy";
import type { AnalyticsProperties } from "./types";

export function trackPageView(path: string, properties?: AnalyticsProperties): void {
  track("page_view", {
    path,
    ...properties,
  });
}

export function trackWalletConnect(opts: {
  success: boolean;
  networkLabel?: string;
  walletAddress?: string | null;
  errorCode?: string;
}): void {
  if (opts.success) {
    track(
      "wallet_connect",
      withWalletFingerprint(
        {
          network: opts.networkLabel ?? null,
        },
        opts.walletAddress,
      ),
    );
  } else {
    track("wallet_connect_failed", {
      error_code: opts.errorCode ?? "unknown",
    });
  }
}

export function trackWalletDisconnect(): void {
  track("wallet_disconnect");
}

export function trackProjectView(
  projectId: string,
  properties?: AnalyticsProperties,
): void {
  track("project_view", {
    project_id: projectId,
    ...properties,
  });
}

/**
 * Search engagement without storing the raw query string.
 * Only length bucket + result count are emitted.
 */
export function trackSearch(opts: {
  queryLength: number;
  resultCount?: number;
  source?: string;
}): void {
  track("search", {
    query_length_bucket: bucketQueryLength(opts.queryLength),
    has_query: opts.queryLength > 0,
    result_count: opts.resultCount ?? null,
    source: opts.source ?? "discover",
  });
}

export function trackFilter(opts: {
  filterType: string;
  filterValue: string;
  source?: string;
}): void {
  track("filter", {
    filter_type: opts.filterType,
    filter_value: opts.filterValue,
    source: opts.source ?? "discover",
  });
}

export function trackProjectSubmit(opts: {
  success: boolean;
  mode: "create" | "edit";
  category?: string;
  projectId?: string;
  errorCode?: string;
}): void {
  if (opts.success) {
    track("project_submit", {
      mode: opts.mode,
      category: opts.category ?? null,
      project_id: opts.projectId ?? null,
    });
  } else {
    track("project_submit_failed", {
      mode: opts.mode,
      error_code: opts.errorCode ?? "unknown",
    });
  }
}

export function trackVerificationRequest(opts: {
  success: boolean;
  /** Opaque project identifier / domain — never a wallet. */
  projectRefLength?: number;
  errorCode?: string;
}): void {
  if (opts.success) {
    track("verification_request", {
      project_ref_length: opts.projectRefLength ?? null,
    });
  } else {
    track("verification_request_failed", {
      error_code: opts.errorCode ?? "unknown",
    });
  }
}

export function trackReviewSubmit(opts: {
  success: boolean;
  action: "create" | "update";
  projectId: string;
  rating?: number;
  commentLength?: number;
  walletAddress?: string | null;
  errorCode?: string;
}): void {
  const base = withWalletFingerprint(
    {
      action: opts.action,
      project_id: opts.projectId,
      rating: opts.rating ?? null,
      comment_length: opts.commentLength ?? null,
    },
    opts.walletAddress,
  );

  if (opts.success) {
    track(opts.action === "update" ? "review_update" : "review_submit", base);
  } else {
    track("review_submit_failed", {
      ...base,
      error_code: opts.errorCode ?? "unknown",
    });
  }
}
