"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { projectService } from "@/services/project/project.service";
import { reviewService } from "@/services/review/review.service";
import { verificationService, type VerificationRequest } from "@/services/stellar/verification.service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import WalletStatePanel, {
  WalletStateLoadingPanel,
} from "@/components/wallet/WalletStatePanel";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { useStellarAccount } from "@/hooks/useStellarAccount";
import {
  LogOut,
  Star,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Bookmark,
} from "lucide-react";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { formatDate } from "@/lib/date";
import { useRecentViews } from "@/hooks/useRecentViews";
import { RecentlyViewedProjects } from "@/components/projects/RecentlyViewedProjects";
import { useConfirm } from "@/hooks/useConfirm";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { useSavedProjects } from "@/hooks/useSavedProjects";

interface StellarNonNativeBalance {
  asset_code?: string;
  asset_issuer?: string;
}

const PROFILE_PURPOSE =
  "Connect your Stellar wallet to view your profile, manage reviews, and track your activity on Dongle.";

export default function ProfilePage() {
  const router = useRouter();
  const gate = useWalletPageGate({ requireFundedAccount: true });
  const { balances } = useStellarAccount();
  const confirm = useConfirm();
  const { recentProjects, clearHistory, hasHistory } = useRecentViews(gate.publicKey || undefined);
  const { savedProjectIds } = useSavedProjects();
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [loadedVerificationKey, setLoadedVerificationKey] = useState<string | null>(null);

  const userReviews = gate.publicKey
    ? reviewService.getReviewsByUser(gate.publicKey)
    : [];

  const displayedVerificationRequests = gate.publicKey ? verificationRequests : [];
  const loadingVerifications =
    Boolean(gate.publicKey) && loadedVerificationKey !== gate.publicKey;
  const savedProjects = savedProjectIds
    .map((projectId) => projectService.getProjectById(projectId))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));

  const handleClearHistory = async () => {
    const ok = await confirm({
      title: "Clear viewing history",
      description: "This will permanently remove your recently viewed projects. This action cannot be undone.",
      confirmLabel: "Clear History",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    
    if (ok) {
      clearHistory();
    }
  };

  useEffect(() => {
    if (!gate.publicKey) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const requests = await verificationService.getVerificationRequestsByUser(
          gate.publicKey!,
        );
        if (!cancelled) {
          setVerificationRequests(requests);
          setLoadedVerificationKey(gate.publicKey);
        }
      } catch (err: unknown) {
        console.error("Error loading verification requests:", err);
        if (!cancelled) {
          setVerificationRequests([]);
          setLoadedVerificationKey(gate.publicKey);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gate.publicKey]);

  if (gate.state !== "ready") {
    return (
      <LayoutWrapper>
        <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
          <div className="container mx-auto px-4 max-w-2xl">
            {gate.state === "account-loading" ? (
              <WalletStateLoadingPanel message="Loading your profile..." />
            ) : (
              <WalletStatePanel
                state={gate.state}
                pagePurpose={PROFILE_PURPOSE}
                walletNetworkLabel={gate.walletNetworkLabel}
                publicKey={gate.publicKey}
                onConnect={gate.connectWallet}
                onDisconnect={gate.disconnectWallet}
              />
            )}
          </div>
        </main>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h1 className="text-4xl font-black mb-2 tracking-tight">
                YOUR PROFILE
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400">
                Manage your account and view your activity on Dongle.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={gate.disconnectWallet}
              className="inline-flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <h2 className="text-2xl font-bold mb-6">Account Summary</h2>

                <div className="mb-8">
                  <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">
                    Wallet Address
                  </label>
                  <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                    <AddressDisplay
                      address={gate.publicKey!}
                      copyable={true}
                      truncated={false}
                      inline={true}
                      className="flex-1 text-sm font-mono text-zinc-900 dark:text-zinc-100 break-all"
                    />
                  </div>
                </div>

                {balances && balances.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 block">
                      Balances
                    </label>
                    <div className="space-y-3">
                      {balances.map((balance, idx) => {
                        const isNative = balance.asset_type === "native";
                        const assetCode = isNative
                          ? "Lumens (XLM)"
                          : (balance as StellarNonNativeBalance).asset_code || "Unknown";
                        const issuer = (balance as StellarNonNativeBalance).asset_issuer;

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl"
                          >
                            <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5 text-yellow-500" />
                              <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {assetCode}
                                </p>
                                {!isNative && issuer && (
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 flex-wrap">
                                    <AddressDisplay address={issuer} copyable={true} truncated={true} inline={true} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">
                              {parseFloat(balance.balance).toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    Your Reviews
                  </h2>
                  <Badge variant="secondary">{userReviews.length}</Badge>
                </div>

                {userReviews.length > 0 ? (
                  <div className="space-y-4">
                    {userReviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer"
                        onClick={() => router.push(`/projects/${review.projectId}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">
                              {review.projectName}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formatDate(review.createdAt, "relative")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-500">
                              {review.rating}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {review.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No reviews yet. Start reviewing projects!</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/discover")}
                      className="mt-4"
                    >
                      Discover Projects
                    </Button>
                  </div>
                )}
              </div>

              {/* Recently Viewed Projects */}
              {hasHistory && (
                <RecentlyViewedProjects
                  projects={recentProjects}
                  onClear={handleClearHistory}
                />
              )}

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Bookmark className="w-6 h-6" />
                    Saved Projects
                  </h2>
                  <Badge variant="secondary">{savedProjects.length}</Badge>
                </div>

                {savedProjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No saved projects yet. Bookmark projects to revisit them later.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/discover")}
                      className="mt-4"
                    >
                      Browse Projects
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Submitted Projects
                  </h2>
                  <Badge variant="secondary">{displayedVerificationRequests.length}</Badge>
                </div>

                {loadingVerifications ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="md" />
                  </div>
                ) : displayedVerificationRequests.length > 0 ? (
                  <div className="space-y-4">
                    {displayedVerificationRequests.map((request) => {
                      const statusColors = {
                        PENDING: {
                          bg: "bg-yellow-50 dark:bg-yellow-900/20",
                          text: "text-yellow-700 dark:text-yellow-500",
                          icon: Clock,
                        },
                        VERIFIED: {
                          bg: "bg-green-50 dark:bg-green-900/20",
                          text: "text-green-700 dark:text-green-500",
                          icon: CheckCircle,
                        },
                        REJECTED: {
                          bg: "bg-red-50 dark:bg-red-900/20",
                          text: "text-red-700 dark:text-red-500",
                          icon: XCircle,
                        },
                        NONE: {
                          bg: "bg-zinc-50 dark:bg-zinc-800",
                          text: "text-zinc-700 dark:text-zinc-500",
                          icon: AlertCircle,
                        },
                      };

                      const status = statusColors[request.status];
                      const StatusIcon = status.icon;

                      return (
                        <div
                          key={request.id}
                          className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                                {request.projectName}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                Submitted {formatDate(request.submittedAt, "relative")}
                              </p>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${status.bg}`}>
                              <StatusIcon className={`w-4 h-4 ${status.text}`} />
                              <span className={`text-sm font-medium ${status.text}`}>
                                {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                              </span>
                            </div>
                          </div>
                          {request.rejectionReason && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <p className="text-xs font-medium text-red-700 dark:text-red-500 mb-1">
                                Rejection Reason:
                              </p>
                              <p className="text-sm text-red-600 dark:text-red-400">
                                {request.rejectionReason}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No submitted projects yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/projects/new")}
                      className="mt-4"
                    >
                      Submit Your First Project
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Activity Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Reviews
                    </span>
                    <span className="font-bold text-lg">{userReviews.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Avg Rating
                    </span>
                    <span className="font-bold text-lg">
                      {userReviews.length > 0
                        ? (
                            userReviews.reduce((sum, r) => sum + r.rating, 0) /
                            userReviews.length
                          ).toFixed(1)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Submitted
                    </span>
                    <span className="font-bold text-lg">{displayedVerificationRequests.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => router.push("/discover")}
                  >
                    Browse Projects
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/reviews")}
                  >
                    View All Reviews
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/projects/new")}
                  >
                    Submit Project
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </LayoutWrapper>
  );
}
