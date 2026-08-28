"use client";

import { Suspense } from "react";
import AnalyticsProvider from "./AnalyticsProvider";

/**
 * Suspense boundary required by Next.js when a child reads `useSearchParams`.
 */
export default function AnalyticsRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </Suspense>
  );
}
