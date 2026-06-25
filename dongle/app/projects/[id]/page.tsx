"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectService } from "@/services/project/project.service";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import VerificationStatus from "@/components/verify/VerificationStatus";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewForm from "@/components/reviews/ReviewForm";
import ProjectImage from "@/components/projects/ProjectImage";
import { Review } from "@/types/review";
import { formatDate } from "@/lib/date";
import { reviewService } from "@/services/review/review.service";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { useConfirm } from "@/hooks/useConfirm";
import WalletStatePanel, {
  WalletDisconnectedBanner,
} from "@/components/wallet/WalletStatePanel";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Globe,
  Star,
  MessageSquare,
  Calendar,
  AlertCircle,
} from "lucide-react";

const PROJECT_REVIEW_PURPOSE =
  "Connect Freighter to write or manage reviews for this project.";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gate = useWalletPageGate();
  const confirm = useConfirm();
  const projectId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ReturnType<typeof projectService.getProjectById>>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showWalletGate, setShowWalletGate] = useState(false);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      const foundProject = projectService.getProjectById(projectId);
      setProject(foundProject);

      // Load reviews from shared service
      if (foundProject) {
        setReviews(reviewService.getReviewsByProject(foundProject.id));
      }

      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [projectId]);

  const handleAddReview = () => {
    if (gate.state !== "ready") {
      setShowWalletGate(true);
      return;
    }
    setIsAddingReview(true);
    setShowWalletGate(false);
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setIsAddingReview(true);
  };

  const handleDelete = async (id: string) => {
    if (!gate.publicKey) return;
    const ok = await confirm({
      title: "Delete review",
      description:
        "This will permanently remove your review. This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Keep it",
      variant: "danger",
    });
    if (!ok) return;
    reviewService.deleteReview(id, gate.publicKey);
    setReviews(reviewService.getReviewsByProject(projectId));
  };

  const handleSubmitReview = (data: { rating: number; comment: string }) => {
    if (!gate.publicKey || !project) return;

    if (editingReview) {
      reviewService.updateReview(editingReview.id, data, gate.publicKey);
    } else {
      reviewService.addReview(
        {
          projectId: project.id,
          projectName: project.name,
          userAddress: gate.publicKey,
          ...data,
        },
        gate.publicKey
      );
    }

    setReviews(reviewService.getReviewsByProject(projectId));
    setIsAddingReview(false);
    setEditingReview(null);
  };

  const handleCancelReview = () => {
    setIsAddingReview(false);
    setEditingReview(null);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-24">
            <Spinner size="lg" className="mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">
              Loading project details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <AlertCircle className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Project Not Found</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              The project you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <Button
              variant="primary"
              onClick={() => router.push("/discover")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discover
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Project Header */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <Badge variant="primary" className="mb-3">
                      {project.category}
                    </Badge>
                    <h1 className="text-4xl font-bold mb-4">{project.name}</h1>
                    <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {project.rating}
                        </span>
                        <span>({project.reviews} reviews)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(project.createdAt, "long")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Image */}
                <ProjectImage
                  logoUrl={project.logoUrl}
                  name={project.name}
                  className="mb-6"
                  fallbackTextSize="text-4xl"
                />

                {/* Description */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-3">About</h2>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3">
                  {project.websiteUrl && (
                    <a
                      href={project.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <Globe className="w-4 h-4 mr-2" />
                        Website
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  )}
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <GitBranch className="w-4 h-4 mr-2" />
                        GitHub
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    Reviews
                  </h2>
                  {!isAddingReview && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddReview}
                    >
                      Write a Review
                    </Button>
                  )}
                </div>

                {/* Soft gate banner for disconnected users */}
                {gate.state === "disconnected" && !showWalletGate && (
                  <WalletDisconnectedBanner
                    pagePurpose={PROJECT_REVIEW_PURPOSE}
                    onConnect={gate.connectWallet}
                    isConnecting={gate.isConnecting}
                  />
                )}

                {/* Compact hard gate when user clicks Write a Review while not connected */}
                {showWalletGate &&
                  gate.state !== "ready" &&
                  gate.state !== "account-loading" && (
                  <div className="mb-6">
                    <WalletStatePanel
                      state={gate.state}
                      pagePurpose={PROJECT_REVIEW_PURPOSE}
                      walletNetworkLabel={gate.walletNetworkLabel}
                      publicKey={gate.publicKey}
                      onConnect={gate.connectWallet}
                      onDisconnect={gate.disconnectWallet}
                      compact
                    />
                  </div>
                )}

                {(isAddingReview || editingReview) && project && gate.state === "ready" && (
                  <div className="mb-6">
                    <ReviewForm
                      projectId={project.id}
                      projectName={project.name}
                      userAddress={gate.publicKey || ""}
                      initialReview={editingReview || undefined}
                      onSubmit={handleSubmitReview}
                      onCancel={handleCancelReview}
                    />
                  </div>
                )}
                <ReviewList
                  reviews={reviews}
                  currentUserAddress={gate.publicKey}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Verification Status */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Verification Status</h3>
                <VerificationStatus initialProjectId={project.id} />
              </div>

              {/* Quick Stats */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Rating
                    </span>
                    <span className="font-bold">{project.rating} / 5.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Total Reviews
                    </span>
                    <span className="font-bold">{project.reviews}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Category
                    </span>
                    <span className="font-bold">{project.category}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleAddReview}
                  >
                    Leave a Review
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/verify")}
                  >
                    Request Verification
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
  );
}
