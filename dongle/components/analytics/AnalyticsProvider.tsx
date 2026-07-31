"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

/**
 * Emits a `page_view` event on client-side route changes.
 * Query strings are intentionally omitted from the path property for privacy.
 */
export default function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // Deduplicate identical path emissions (e.g. Strict Mode double-invoke)
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    const hasQuery = Boolean(searchParams?.toString());
    trackPageView(pathname, {
      has_query: hasQuery,
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
