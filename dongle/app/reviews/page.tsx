"use client";

import { useState, useMemo } from "react";
import { reviewService } from "@/services/review/review.service";
import { Review, Project } from "@/types/review";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewForm from "@/components/reviews/ReviewForm";
import { mockProjects } from "@/data/mockProjects";
import { toast } from "sonner";
import WalletStatePanel, {
  WalletDisconnectedBanner,
} from "@/components/wallet/WalletStatePanel";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";

const REVIEWS_PURPOSE =
  "Connect Freighter to post, edit, or delete your community reviews on Dongle.";

export default function ReviewsPage() {
  const gate = useWalletPageGate();
  const [reviews, setReviews] = useState<Review[]>(() =>
    reviewService.getReviews(),
  );
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "helpfulness">("recent");
  const [showWalletGate, setShowWalletGate] = useState(false);

  const handleAddReview = (project: Project) => {
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
    const project = mockProjects.find((p) => p.id === review.projectId) || {
      id: review.projectId,
      name: review.projectName,
      category: "",
      description: "",
      rating: 0,
      reviews: 0,
    };
    setSelectedProject(project);
  };

  const handleDeleteReview = (id: string) => {
    if (!gate.publicKey) {
      setShowWalletGate(true);
      return;
    }
    if (confirm("Are you sure you want to delete this review?")) {
      const result = reviewService.deleteReview(id, gate.publicKey);
      if (result.success) {
        setReviews(reviewService.getReviews());
        toast.success("Review deleted");
      } else {
        toast.error(result.error || "Failed to delete review");
      }
    }
  };

  const handleVoteHelpful = (id: string) => {
    if (!gate.publicKey) {
      toast.error("Please connect your wallet to vote");
      return;
    }
    const result = reviewService.voteHelpful(id, gate.publicKey);
    if (result.success) {
      setReviews(reviewService.getReviews());
    } else {
      toast.error(result.error || "Failed to submit vote");
    }
  };

  const handleVoteUnhelpful = (id: string) => {
    if (!gate.publicKey) {
      toast.error("Please connect your wallet to vote");
      return;
    }
    const result = reviewService.voteUnhelpful(id, gate.publicKey);
    if (result.success) {
      setReviews(reviewService.getReviews());
    } else {
      toast.error(result.error || "Failed to submit vote");
    }
  };

  const handleSubmit = (data: { rating: number; comment: string }) => {
    if (!gate.publicKey || !selectedProject) return;

    if (editingReview) {
      const result = reviewService.updateReview(editingReview.id, data, gate.publicKey);
      if (result.success) {
        setReviews(reviewService.getReviews());
        setIsAddingReview(false);
        setEditingReview(null);
        setSelectedProject(null);
        toast.success("Review updated");
      } else {
        toast.error(result.errors?.[0]?.message || "Failed to update review");
      }
    } else {
      const result = reviewService.addReview(
        {
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          userAddress: gate.publicKey,
          ...data,
        },
        gate.publicKey,
      );
      if (result.success) {
        setReviews(reviewService.getReviews());
        setIsAddingReview(false);
        setEditingReview(null);
        setSelectedProject(null);
        toast.success("Review posted");
      } else {
        toast.error(result.errors?.[0]?.message || "Failed to post review");
      }
    }
  };

  const sortedReviews = useMemo(() => {
    const list = [...reviews];
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
  }, [reviews, sortBy]);

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
          </div>
          {!isAddingReview && !editingReview && gate.state === "ready" && (
            <div className="flex gap-2">
              {mockProjects.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddReview(p)}
                  className="text-xs font-bold px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
                >
                  Review {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

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
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Sort by:</span>
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
      </div>
    </div>
  );
}
