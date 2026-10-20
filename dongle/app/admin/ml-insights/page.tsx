"use client";

/**
 * ML predictions dashboard (Issue #711) at /admin/ml-insights.
 */

import { useAdminAccess } from "@/hooks/useAdminAccess";
import WalletGate from "@/components/wallet/WalletGate";
import MLInsightsPanel from "@/components/admin/MLInsightsPanel";
import { AlertCircle, Sparkles } from "lucide-react";

const ADMIN_PURPOSE =
  "Connect an authorized admin Freighter wallet to view ML predictions.";

export default function MLInsightsPage() {
  const { isAdmin, gate } = useAdminAccess();

  if (gate.state !== "ready") {
    return (
      <div className="container mx-auto px-4 py-32 min-h-screen max-w-2xl">
        <WalletGate
          gate={gate}
          pagePurpose={ADMIN_PURPOSE}
          loadingMessage="Verifying wallet access..."
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center min-h-screen">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          ML predictions are limited to authorized admins.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-8 flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-violet-500" />
        <div>
          <h1 className="text-3xl font-bold">ML Insights</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Trending, churn, and verification predictions with confidence scores.
          </p>
        </div>
      </header>
      <MLInsightsPanel />
    </div>
  );
}
