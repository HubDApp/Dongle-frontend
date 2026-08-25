/**
 * Next.js Link Prefetch Configuration
 * 
 * This module defines prefetch behavior for different route types to optimize performance:
 * - Critical navigation links are prefetched on viewport entry
 * - Heavy routes are prefetched only on hover for desktop
 * - Mobile users get minimal prefetching to save bandwidth
 * 
 * Next.js Link prefetch prop values:
 * - true (default): Prefetch on viewport entry
 * - false: No prefetch
 * - null: Prefetch on hover only
 */

/**
 * Detect if the user is on a mobile/low-power device
 * Used to conditionally disable expensive prefetches
 */
export function isMobileOrLowPower(): boolean {
  if (typeof window === "undefined") return false;

  // Check for mobile user agent
  const userAgent = navigator.userAgent || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // Check for reduced motion preference (often indicates low-power mode)
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Check for save-data preference
  const saveData = "connection" in navigator && (navigator as any).connection?.saveData === true;

  return isMobile || prefersReducedMotion || saveData;
}

/**
 * Route categories for prefetch behavior
 */
export type RouteCategory = 
  | "landing"           // Home, marketing pages
  | "navigation"        // Primary nav links (Discover, Reviews, Verify, Profile)
  | "project-detail"    // Individual project pages (heavy with blockchain data)
  | "project-list"      // Filtered/category project lists
  | "transaction-flow"  // Submit project, edit, verification flows
  | "admin"             // Admin panel
  | "static";           // Terms, privacy, docs

/**
 * Prefetch strategy per route category
 */
interface PrefetchStrategy {
  desktop: boolean | null;  // true = viewport, null = hover, false = disabled
  mobile: boolean | null;   // true = viewport, null = hover, false = disabled
  reason: string;
}

export const PREFETCH_STRATEGIES: Record<RouteCategory, PrefetchStrategy> = {
  landing: {
    desktop: true,
    mobile: true,
    reason: "Home page is lightweight and frequently accessed",
  },
  
  navigation: {
    desktop: true,
    mobile: null,
    reason: "Primary nav destinations - prefetch on desktop for instant feel, hover-only on mobile",
  },
  
  "project-detail": {
    desktop: null,
    mobile: false,
    reason: "Heavy routes with blockchain data - prefetch on hover for desktop only, disabled on mobile to save bandwidth",
  },
  
  "project-list": {
    desktop: true,
    mobile: null,
    reason: "List pages are useful for navigation - prefetch on desktop, hover-only on mobile",
  },
  
  "transaction-flow": {
    desktop: false,
    mobile: false,
    reason: "Heavy blockchain code - no prefetch, load on demand",
  },
  
  admin: {
    desktop: false,
    mobile: false,
    reason: "Rare access, not worth prefetching",
  },
  
  static: {
    desktop: null,
    mobile: null,
    reason: "Lightweight pages - hover prefetch is sufficient",
  },
};

/**
 * Get the prefetch value for a route category
 * Automatically detects mobile/low-power and adjusts
 * 
 * @example
 * <Link href="/projects/123" prefetch={getPrefetchValue("project-detail")} />
 */
export function getPrefetchValue(category: RouteCategory): boolean | null {
  const strategy = PREFETCH_STRATEGIES[category];
  const isMobileLowPower = isMobileOrLowPower();
  
  return isMobileLowPower ? strategy.mobile : strategy.desktop;
}

/**
 * Helper to determine route category from href
 * This is a simple heuristic - adjust based on your routing structure
 */
export function getRouteCategory(href: string): RouteCategory {
  if (href === "/") return "landing";
  
  if (href === "/discover" || href === "/reviews" || href === "/verify" || href === "/profile") {
    return "navigation";
  }
  
  if (href.startsWith("/projects/") && href.includes("/edit")) {
    return "transaction-flow";
  }
  
  if (href.startsWith("/projects/new")) {
    return "transaction-flow";
  }
  
  if (href.startsWith("/projects/") && !href.includes("/edit")) {
    return "project-detail";
  }
  
  if (href.startsWith("/admin")) {
    return "admin";
  }
  
  if (href === "/terms" || href === "/privacy" || href === "/docs") {
    return "static";
  }
  
  return "project-list";
}

/**
 * Smart Link wrapper that automatically applies prefetch strategy
 * 
 * @example
 * <SmartLink href="/projects/123" className="...">
 *   View Project
 * </SmartLink>
 */
export function getSmartPrefetch(href: string): boolean | null {
  const category = getRouteCategory(href);
  return getPrefetchValue(category);
}
