"use client";

import { useState, useMemo, useEffect } from "react";
import { reviewService, isReviewPersistenceApi } from "@/services/review/review.service";
import { projectService } from "@/services/project/project.service";
import { Review, Project as ReviewProject } from "@/types/review";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewForm from "@/components/reviews/ReviewForm";
import { toast } from "sonner";
import WalletStatePanel, {
  WalletDisconnectedBanner,
} from "@/components/wallet/WalletStatePanel";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { trackReviewSubmit } from "@/lib/analytics";

const REVIEWS_PURPOSE =
  "Connect Freighter to post, edit, or delete your community reviews on Dongle.";

export default function ReviewsPage() {
  const gate = useWalletPageGate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [selectedProject, setSelectedProject] = useState<ReviewProject | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "helpfulness">("recent");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [showWalletGate, setShowWalletGate] = useState(false);

  useEffect(() => {
    void (async () => {
      const loaded = await reviewService.getReviews();
      setReviews(loaded);
      setIsLoading(false);
    })();
  }, []);

  const handleAddReview = (project: ReviewProject) => {
    if (gate.state !== "ready") {
      setShowWalletGate(true);
      return;
    }
    setSelectedProject(project);
    setIsAddingReview(true);
    setShowWalletGate(false);
  };

  const handleEditReview = (review: Review) => {
    if (gate.state !== "ready") {
      setShowWalletGate(true);
      return;
    }
    setEditingReview(review);
    const project = projectService.getProjectById(review.projectId);
    setSelectedProject(
      project ? {
        id: project.id,
        name: project.name,
        primaryCategory: project.primaryCategory,
        tags: project.tags,
        description: project.description,
        rating: project.rating,
        reviews: project.reviews,
        createdAt: project.createdAt,
      } : {
        id: review.projectId,
        name: review.projectName,
        primaryCategory: "DeFi / DEX" as const,
        tags: [],
        description: "",
        rating: 0,
        reviews: 0,
        createdAt: new Date().toISOString(),
      }
    );
  };

  const handleDeleteReview = async (id: string) => {
    if (!gate.publicKey) {
      setShowWalletGate(true);
      return;
    }
    if (confirm("Are you sure you want to delete this review?")) {
      const result = await reviewService.deleteReview(id, gate.publicKey);
      if (result.success) {
        setReviews(await reviewService.getReviews());
        toast.success("Review deleted");
      } else {
        toast.error(result.error || "Failed to delete review");
      }
    }
  };

  const handleVoteHelpful = async (id: string) => {
    if (!gate.publicKey) {
      toast.error("Please connect your wallet to vote");
      return;
    }
    const result = await reviewService.voteHelpful(id, gate.publicKey);
    if (result.success) {
      setReviews(await reviewService.getReviews());
    } else {
      toast.error(result.error || "Failed to submit vote");
    }
  };

  const handleVoteUnhelpful = async (id: string) => {
    if (!gate.publicKey) {
      toast.error("Please connect your wallet to vote");
      return;
    }
    const result = await reviewService.voteUnhelpful(id, gate.publicKey);
    if (result.success) {
      setReviews(await reviewService.getReviews());
    } else {
      toast.error(result.error || "Failed to submit vote");
    }
  };

  const handleSubmit = async (data: { rating: number; comment: string }) => {
    if (!gate.publicKey || !selectedProject) return;

    if (editingReview) {
      const result = await reviewService.updateReview(editingReview.id, data, gate.publicKey);
      if (result.success) {
        trackReviewSubmit({
          success: true,
          action: "update",
          projectId: selectedProject.id,
          rating: data.rating,
          commentLength: data.comment.length,
          walletAddress: gate.publicKey,
        });
        setReviews(await reviewService.getReviews());
        setIsAddingReview(false);
        setEditingReview(null);
        setSelectedProject(null);
        toast.success("Review updated");
      } else {
        trackReviewSubmit({
          success: false,
          action: "update",
          projectId: selectedProject.id,
          rating: data.rating,
          commentLength: data.comment.length,
          walletAddress: gate.publicKey,
          errorCode: "validation_or_auth",
        });
        toast.error(result.errors?.[0]?.message || "Failed to update review");
      }
    } else {
      const result = await reviewService.addReview(
        {
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          userAddress: gate.publicKey,
          ...data,
        },
        gate.publicKey,
      );
      if (result.success) {
        trackReviewSubmit({
          success: true,
          action: "create",
          projectId: selectedProject.id,
          rating: data.rating,
          commentLength: data.comment.length,
          walletAddress: gate.publicKey,
        });
        setReviews(await reviewService.getReviews());
        setIsAddingReview(false);
        setEditingReview(null);
        setSelectedProject(null);
        toast.success("Review posted");
      } else {
        trackReviewSubmit({
          success: false,
          action: "create",
          projectId: selectedProject.id,
          rating: data.rating,
          commentLength: data.comment.length,
          walletAddress: gate.publicKey,
          errorCode: "validation_or_auth",
        });
        toast.error(result.errors?.[0]?.message || "Failed to post review");
      }
    }
  };

  const sortedReviews = useMemo(() => {
    let list = [...reviews];
    if (projectFilter !== "all") {
      list = list.filter((r) => r.projectId === projectFilter);
    }
    if (sortBy === "helpfulness") {
      return list.sort((a, b) => {
        const votesA = a.helpfulVotes?.length || 0;
        const votesB = b.helpfulVotes?.length || 0;
        if (votesA !== votesB) {
          return votesB - votesA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reviews, sortBy, projectFilter]);

  const allProjects = projectService.getAllProjects();
  const topProjects = allProjects.slice(0, 6);

  const walletBlocked =
    showWalletGate && gate.state !== "ready" && gate.state !== "account-loading";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">
              COMMUNITY REVIEWS
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Transparent feedback from the Stellar ecosystem.
            </p>
            {!isReviewPersistenceApi() && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>DEV-ONLY: Reviews stored in localStorage — data will not persist across browsers or devices. Set <code className="font-mono font-bold">NEXT_PUBLIC_REVIEW_PERSISTENCE=api</code> for server-side persistence.</span>
              </div>
            )}
          </div>
          {!isAddingReview && !editingReview && gate.state === "ready" && (
            <div className="flex gap-2">
              {topProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddReview({
                    id: p.id,
                    name: p.name,
                    primaryCategory: p.primaryCategory,
                    tags: p.tags,
                    description: p.description,
                    rating: p.rating,
                    reviews: p.reviews,
                    createdAt: p.createdAt,
                  })}
                  className="text-xs font-bold px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
                >
                  Review {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {gate.state !== "ready" && gate.state !== "account-loading" && !walletBlocked && (
              <WalletDisconnectedBanner
                pagePurpose={REVIEWS_PURPOSE}
                onConnect={gate.connectWallet}
                isConnecting={gate.isConnecting}
              />
            )}

            {walletBlocked &&
              gate.state !== "ready" &&
              gate.state !== "account-loading" && (
              <div className="mb-12">
                <WalletStatePanel
                  state={gate.state}
                  pagePurpose={REVIEWS_PURPOSE}
                  walletNetworkLabel={gate.walletNetworkLabel}
                  publicKey={gate.publicKey}
                  onConnect={gate.connectWallet}
                  onDisconnect={gate.disconnectWallet}
                  onRetry={gate.retryAccountLoad}
                  compact
                />
              </div>
            )}

            {(isAddingReview || editingReview) && selectedProject && gate.state === "ready" && (
              <div className="mb-12">
                <ReviewForm
                  projectId={selectedProject.id}
                  projectName={selectedProject.name}
                  userAddress={gate.publicKey || ""}
                  initialReview={editingReview || undefined}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setIsAddingReview(false);
                    setEditingReview(null);
                    setSelectedProject(null);
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-12">
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-8 bg-blue-500 rounded-full" />
                    {sortBy === "helpfulness" ? "Most Helpful Reviews" : "Recent Activity"}
                  </h2>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 whitespace-nowrap">Filter by:</span>
                      <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold max-w-[150px] truncate"
                      >
                        <option value="all">All Projects</option>
                        {allProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 whitespace-nowrap">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as "recent" | "helpfulness")}
                        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold"
                      >
                        <option value="recent">Recent</option>
                        <option value="helpfulness">Most Helpful</option>
                      </select>
                    </div>
                  </div>
                </div>

                <ReviewList
                  reviews={sortedReviews}
                  currentUserAddress={gate.publicKey}
                  onEdit={handleEditReview}
                  onDelete={handleDeleteReview}
                  onVoteHelpful={handleVoteHelpful}
                  onVoteUnhelpful={handleVoteUnhelpful}
                />
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
