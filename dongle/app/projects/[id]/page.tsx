"use client";

import React, { useState, useEffect } from "react";
import {
  useParams,
  useRouter } from "next/navigation";
import { projectService } from "@/services/project/project.service";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import VerificationStatus from "@/components/verify/VerificationStatus";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewForm from "@/components/reviews/ReviewForm";
import {
  RatingDistributionSummary,
  computeRatingDistribution,
} from "@/components/reviews/RatingDistributionSummary";
import ProjectImage from "@/components/projects/ProjectImage";
import { RepositoryMetadata } from "@/components/projects/RepositoryMetadata";
import { Review,
  ReviewReport,
  ReviewReportReason } from "@/types/review";
import { reviewReportService } from "@/services/review/review-report.service";
import { projectReportService } from "@/services/project/project-report.service";
import { projectClaimService } from "@/services/project/project-claim.service";
import { formatDate } from "@/lib/date";
import { reviewService, getReviewPersistenceLabel } from "@/services/review/review.service";
import { sorobanService } from "@/services/stellar/soroban.service";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { useConfirm } from "@/hooks/useConfirm";
import WalletStatePanel,
  {
  WalletDisconnectedBanner,
  } from "@/components/wallet/WalletStatePanel";
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Bug,
  Calendar,
  ExternalLink,
  GitBranch,
  Globe,
  Info,
  Megaphone,
  MessageSquare,
  Shield,
  Star,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { ReportProjectModal } from "@/components/projects/ReportProjectModal";
import { ReportReviewModal } from "@/components/reviews/ReportReviewModal";
import { reviewReportService } from "@/services/review/review-report.service";
import { useWatchlist } from "@/hooks/useWatchlist";
import { reviewModerationService } from "@/services/review/review-moderation.service";
import { updateService } from "@/services/update/update.service";
import { abbreviateStellarAddress } from "@/lib/stellar-address";
import { ContractAddressList } from "@/components/projects/ContractAddressList";
import { ProjectUpdate, UpdateType } from "@/types/update";
import UpdateList from "@/components/updates/UpdateList";
import UpdateForm from "@/components/updates/UpdateForm";
import { VerificationBadge } from "@/components/projects/VerificationBadge";
import { ProjectStatusBanner } from "@/components/projects/ProjectStatusBanner";
import { ClaimStatusBanner } from "@/components/projects/ClaimStatusBanner";
import { getApprovedProjectUrls } from "@/lib/externalLinkWarning";
import { SafeExternalLink } from "@/components/ui/SafeExternalLink";
import { recentViewsService } from "@/services/recent-views/recent-views.service";
import { trackProjectView, trackReviewSubmit } from "@/lib/analytics";

const PROJECT_REVIEW_PURPOSE =
  "Connect Freighter to write or manage reviews for this project.";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gate = useWalletPageGate();
  const confirm = useConfirm();
  const {
    isOnWatchlist,
    toggleWatchlist,
    canManageWatchlist,
    addToWatchlist,
  } = useWatchlist();
  const [reviewRequiresCaptcha, setReviewRequiresCaptcha] = useState(false);
  const [dailyReviewCount, setDailyReviewCount] = useState(0);
  const projectId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ReturnType<typeof projectService.getProjectById>>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showWalletGate, setShowWalletGate] = useState(false);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isReportingReview, setIsReportingReview] = useState(false);
  const [reportingReview, setReportingReview] = useState<Review | null>(null);
  const [reviewSort, setReviewSort] = useState<"newest" | "oldest" | "highest" | "lowest" | "mine">("newest");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [verificationStatus, setVerificationStatus] = useState<"NONE" | "PENDING" | "VERIFIED" | "REJECTED" | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<ProjectUpdate | null>(null);
  const [activeTab, setActiveTab] = useState<"about" | "updates">("about");
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    let cancelled = false;

    // Simulate data loading
    const timer = setTimeout(() => {
      if (cancelled || abortController.signal.aborted) return;

      const foundProject = projectService.getProjectById(projectId);
      setProject(foundProject);

      // Load reviews from shared service
      if (foundProject) {
        void (async () => {
          const loaded = await reviewService.getReviewsByProject(foundProject.id);
          setReviews(loaded);
        })();
        setUpdates(updateService.getUpdatesByProject(foundProject.id));
        
        // Track this project view
        recentViewsService.addView(foundProject.id, gate.publicKey || undefined);
        trackProjectView(foundProject.id, {
          category: foundProject.primaryCategory,
        });
        
        // Fetch verification status with cancellation support
        const fetchVerification = async () => {
          if (!cancelled) setVerificationError(null);
          try {
            const status = await sorobanService.getVerificationStatus(projectId, abortController.signal);
            if (!cancelled) {
              setVerificationStatus(status);
            }
          } catch (error) {
            if (!cancelled) {
              console.error("Failed to fetch verification status:", error);
              setVerificationError(
                error instanceof Error ? error.message : "Failed to load verification status",
              );
            }
          }
        };
        fetchVerification();
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      abortController.abort();
    };
  }, [projectId, gate.publicKey]);

  const retryVerification = React.useCallback(() => {
    setVerificationError(null);
    setVerificationStatus(null);
    const abortController = new AbortController();
    void sorobanService
      .getVerificationStatus(projectId, abortController.signal)
      .then(setVerificationStatus)
      .catch((err) => {
        console.error("Failed to fetch verification status:", err);
        setVerificationError(
          err instanceof Error ? err.message : "Failed to load verification status",
        );
      });
  }, [projectId]);

  const actualRating = React.useMemo(() => {
    if (reviews.length === 0) return project?.rating || 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews, project?.rating]);

  const actualReviewCount = reviews.length || project?.reviews || 0;

  const isOwner = project && gate.publicKey && project.ownerAddress === gate.publicKey;
  const isOnList = project ? isOnWatchlist(project.id) : false;

  useEffect(() => {
    if (!gate.publicKey) {
      setReviewRequiresCaptcha(false);
      setDailyReviewCount(0);
      return;
    }
    void reviewModerationService.checkVelocity(gate.publicKey).then((result) => {
      setReviewRequiresCaptcha(result.requiresCaptcha);
      setDailyReviewCount(result.dailyCount);
    });
  }, [gate.publicKey]);

  const handleToggleWatchlist = () => {
    if (!project) return;
    if (!canManageWatchlist) {
      setShowWalletGate(true);
      return;
    }

    if (isOnList) {
      toggleWatchlist(project.id);
      toast.success("Removed from watchlist");
      return;
    }

    const result = addToWatchlist(project.id);
    if (result.success) {
      toast.success("Added to watchlist");
    } else {
      toast.error(result.error ?? "Could not add to watchlist");
    }
  };

  const handleAddReview = () => {
    if (gate.state !== "ready") {
      setShowWalletGate(true);
      return;
    }
    if (isOwner) {
      toast.error("You cannot review your own project.");
      return;
    }
    setIsAddingReview(true);
    setShowWalletGate(false);
  };

  const handleReportSubmit = (data: { reason: string; explanation: string }) => {
    if (!gate.publicKey || !project) return;

    const result = projectReportService.createReport(
      {
        projectId: project.id,
        reason: data.reason,
        explanation: data.explanation,
      },
      gate.publicKey
    );

    if (result.success) {
      toast.success("Project reported successfully");
    } else {
      const errorMsg = result.errors?.[0]?.message || "Failed to report project";
      toast.error(errorMsg);
    }

    setIsReporting(false);
  };

  const handleClaimSubmit = (data: { proofType: string; proofValue: string; explanation: string }) => {
    if (!gate.publicKey || !project) return;

    const result = projectClaimService.createRequest(
      {
        projectId: project.id,
        proofType: data.proofType,
        proofValue: data.proofValue,
        explanation: data.explanation,
      },
      gate.publicKey
    );

    if (result.success) {
      toast.success("Claim request submitted successfully");
    } else {
      const errorMsg = result.errors?.[0]?.message || "Failed to submit claim request";
      toast.error(errorMsg);
    }

    setIsClaiming(false);
  };

  const handleReportReview = (review: Review) => {
    if (gate.state !== "ready") {
      setShowWalletGate(true);
      return;
    }
    setReportingReview(review);
    setIsReportingReview(true);
  };

  const handleReportReviewSubmit = async (data: { reason: string; explanation: string }) => {
    if (!gate.publicKey || !reportingReview) return;

    const result = await reviewReportService.createReport(
      {
        reviewId: reportingReview.id,
        reason: data.reason as ReviewReportReason,
        explanation: data.explanation,
      },
      gate.publicKey
    );

    if (result.success) {
      toast.success("Review reported successfully");
    } else {
      const errorMsg = result.errors?.[0]?.message || "Failed to report review";
      toast.error(errorMsg);
    }

    setIsReportingReview(false);
    setReportingReview(null);
  };

  const ratingDistribution = React.useMemo(
    () => computeRatingDistribution(reviews),
    [reviews],
  );

  const sortedReviews = React.useMemo(() => {
    let list = [...reviews];
    if (reviewSort === "mine") {
      list = list.filter((r) => r.userAddress === gate.publicKey);
    }
    if (ratingFilter !== "all") {
      const ratingNum = parseInt(ratingFilter, 10);
      list = list.filter((r) => r.rating === ratingNum);
    }
    if (reviewSort === "highest") {
      list.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (reviewSort === "lowest") {
      list.sort((a, b) => a.rating - b.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (reviewSort === "oldest") {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [reviews, reviewSort, ratingFilter, gate.publicKey]);

  const projectEmptyMessage = React.useMemo(() => {
    if (reviews.length === 0) {
      return "No reviews yet. Be the first to leave one!";
    }
    const activeFilters: string[] = [];
    if (reviewSort === "mine") {
      activeFilters.push("your reviews");
    }
    if (ratingFilter !== "all") {
      activeFilters.push(`${ratingFilter}-star rating`);
    }
    if (activeFilters.length > 0) {
      return `No reviews found matching ${activeFilters.join(" and ")}. Try adjusting your filter controls.`;
    }
    return "No reviews match the selected filter options.";
  }, [reviews.length, reviewSort, ratingFilter]);

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
    await reviewService.deleteReview(id, gate.publicKey);
    setReviews(await reviewService.getReviewsByProject(projectId));
  };

  const handleSubmitReview = async (data: {
    rating: number;
    comment: string;
    captchaToken?: string;
  }) => {
    if (!gate.publicKey || !project) return;

    const action = editingReview ? "update" : "create";
    try {
      if (editingReview) {
        await reviewService.updateReview(editingReview.id, data, gate.publicKey);
      } else {
        await reviewService.addReview(
          {
            projectId: project.id,
            projectName: project.name,
            userAddress: gate.publicKey,
            ...data,
          },
          gate.publicKey
        );
      }

      trackReviewSubmit({
        success: true,
        action,
        projectId: project.id,
        rating: data.rating,
        commentLength: data.comment.length,
        walletAddress: gate.publicKey,
      });

      setReviews(await reviewService.getReviewsByProject(projectId));
      setIsAddingReview(false);
      setEditingReview(null);
    } catch (error) {
      trackReviewSubmit({
        success: false,
        action,
        projectId: project.id,
        rating: data.rating,
        commentLength: data.comment.length,
        walletAddress: gate.publicKey,
        errorCode: error instanceof Error ? error.name || "Error" : "unknown",
      });
    }
  };

  const handleCancelReview = () => {
    setIsAddingReview(false);
    setEditingReview(null);
  };

  const handleVoteHelpful = async (id: string) => {
    if (!gate.publicKey) {
      toast.error("Please connect your wallet to vote");
      return;
    }
    const result = await reviewService.voteHelpful(id, gate.publicKey);
    if (result.success) {
      setReviews(await reviewService.getReviewsByProject(projectId));
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
      setReviews(await reviewService.getReviewsByProject(projectId));
    } else {
      toast.error(result.error || "Failed to submit vote");
    }
  };

  const handleAddUpdate = () => {
    setIsAddingUpdate(true);
  };

  const handleSubmitUpdate = (data: {
    type: UpdateType;
    title: string;
    content: string;
    version?: string;
  }) => {
    if (!gate.publicKey || !project) return;

    if (editingUpdate) {
      updateService.updateUpdate(editingUpdate.id, data, gate.publicKey);
      toast.success("Update edited successfully");
    } else {
      updateService.addUpdate(
        {
          projectId: project.id,
          ...data,
        },
        gate.publicKey
      );
      toast.success("Update published successfully");
    }

    setUpdates(updateService.getUpdatesByProject(projectId));
    setIsAddingUpdate(false);
    setEditingUpdate(null);
  };

  const handleCancelUpdate = () => {
    setIsAddingUpdate(false);
    setEditingUpdate(null);
  };

  const handleEditUpdate = (update: ProjectUpdate) => {
    setEditingUpdate(update);
    setIsAddingUpdate(true);
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!gate.publicKey) return;
    const ok = await confirm({
      title: "Delete update",
      description:
        "This will permanently remove this update. This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    try {
      updateService.deleteUpdate(id, gate.publicKey);
      setUpdates(updateService.getUpdatesByProject(projectId));
      toast.success("Update deleted successfully");
    } catch (_error) {
      toast.error("Failed to delete update");
    }
  };

  const approvedExternalUrls = project ? getApprovedProjectUrls(project) : [];

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

          {/* Verification Status Banner */}
          <ProjectStatusBanner status={verificationStatus} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Project Header */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-start justify-between mb-6 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="primary">
                        {project.primaryCategory}
                      </Badge>
                      {verificationStatus && (
                        <VerificationBadge status={verificationStatus} />
                      )}
                    </div>
                    <h1 className="text-4xl font-bold mb-4">{project.name}</h1>
                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {actualRating}
                        </span>
                        <span>({actualReviewCount} reviews)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(project.createdAt, "long")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={isOnList ? "secondary" : "outline"}
                    onClick={handleToggleWatchlist}
                    disabled={!project}
                    leftIcon={isOnList ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    className="shrink-0"
                  >
                    {isOnList ? "On Watchlist" : "Add to Watchlist"}
                  </Button>
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
                  <div className="flex items-center gap-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
                    <button
                      onClick={() => setActiveTab("about")}
                      className={`pb-3 px-1 font-medium transition-colors relative ${
                        activeTab === "about"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      About
                      {activeTab === "about" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("updates")}
                      className={`pb-3 px-1 font-medium transition-colors relative flex items-center gap-2 ${
                        activeTab === "updates"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Megaphone className="w-4 h-4" />
                      Updates
                      {updates.length > 0 && (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
                          {updates.length}
                        </span>
                      )}
                      {activeTab === "updates" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                      )}
                    </button>
                  </div>

                  {activeTab === "about" && (
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {activeTab === "updates" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        {isOwner && !isAddingUpdate && (
                          <Button variant="primary" onClick={handleAddUpdate}>
                            <Megaphone className="w-4 h-4 mr-2" />
                            Post Update
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/projects/${projectId}/updates`)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View full feed
                        </Button>
                      </div>

                      {isAddingUpdate && project && (
                        <UpdateForm
                          projectId={project.id}
                          initialUpdate={editingUpdate || undefined}
                          onSubmit={handleSubmitUpdate}
                          onCancel={handleCancelUpdate}
                        />
                      )}

                      <UpdateList
                        updates={updates}
                        canManage={Boolean(isOwner)}
                        onEdit={handleEditUpdate}
                        onDelete={handleDeleteUpdate}
                      />
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3">
                  {project.websiteUrl && (
                    <SafeExternalLink
                      href={project.websiteUrl}
                      verificationStatus={verificationStatus}
                      approvedUrls={approvedExternalUrls}
                    >
                      <Button variant="outline" size="sm">
                        <Globe className="w-4 h-4 mr-2" />
                        Website
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </SafeExternalLink>
                  )}
                  {project.githubUrl && (
                    <SafeExternalLink
                      href={project.githubUrl}
                      verificationStatus={verificationStatus}
                      approvedUrls={approvedExternalUrls}
                    >
                      <Button variant="outline" size="sm">
                        <GitBranch className="w-4 h-4 mr-2" />
                        GitHub
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </SafeExternalLink>
                  )}
                  {project.auditReportUrl && (
                    <SafeExternalLink
                      href={project.auditReportUrl}
                      verificationStatus={verificationStatus}
                      approvedUrls={approvedExternalUrls}
                    >
                      <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20">
                        <Shield className="w-4 h-4 mr-2" />
                        Audit Report
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </SafeExternalLink>
                  )}
                  {project.bugBountyUrl && (
                    <SafeExternalLink
                      href={project.bugBountyUrl}
                      verificationStatus={verificationStatus}
                      approvedUrls={approvedExternalUrls}
                    >
                      <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                        <Bug className="w-4 h-4 mr-2" />
                        Bug Bounty
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </SafeExternalLink>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    Reviews
                    {getReviewPersistenceLabel() !== "API" && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-full ml-2">
                        DEV-ONLY
                      </span>
                    )}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-zinc-500 text-xs font-medium">Rating:</span>
                      <select
                        aria-label="Filter reviews by rating"
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-zinc-500 text-xs font-medium">Sort:</span>
                      <select
                        aria-label="Sort reviews"
                        value={reviewSort}
                        onChange={(e) => setReviewSort(e.target.value as "newest" | "oldest" | "highest" | "lowest" | "mine")}
                        className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Rating</option>
                        <option value="lowest">Lowest Rating</option>
                        {gate.publicKey && <option value="mine">My Reviews</option>}
                      </select>
                    </div>
                    {!isAddingReview && !isOwner && (
                      <Button
                        variant="primary"
                        onClick={handleAddReview}
                      >
                        Write a Review
                      </Button>
                    )}
                  </div>
                </div>

                <RatingDistributionSummary
                  distribution={ratingDistribution}
                  totalReviews={reviews.length}
                  averageRating={actualRating}
                  className="mb-8"
                />

                {isOwner && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/50 text-sm flex items-start gap-3">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>As the creator of this project, you cannot submit public reviews or ratings for it. We encourage you to reply to user feedback in the community.</p>
                  </div>
                )}

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
                      onRetry={gate.retryAccountLoad}
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
                      dailyReviewCount={dailyReviewCount}
                      requiresCaptcha={reviewRequiresCaptcha}
                      onSubmit={handleSubmitReview}
                      onCancel={handleCancelReview}
                    />
                  </div>
                )}
                <ReviewList
                  reviews={sortedReviews}
                  currentUserAddress={gate.publicKey}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onVoteHelpful={handleVoteHelpful}
                  onVoteUnhelpful={handleVoteUnhelpful}
                  onReport={handleReportReview}
                  emptyMessage={projectEmptyMessage}
                  emptyTitle={sortedReviews.length === 0 && reviews.length > 0 ? "No Matching Reviews" : undefined}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Verification Status */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Verification Status</h3>
                  {verificationError && (
                    <Button variant="outline" size="sm" onClick={retryVerification}>
                      Retry
                    </Button>
                  )}
                </div>
                <VerificationStatus initialProjectId={project.id} />
              </div>

              {/* Repository Metadata */}
              {project.githubUrl && (
                <RepositoryMetadata githubUrl={project.githubUrl} />
              )}

              {/* Quick Stats */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Rating
                    </span>
                      <span className="font-bold">{actualRating} / 5.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Total Reviews
                    </span>
                      <span className="font-bold">{actualReviewCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Category
                    </span>
                    <span className="font-bold">{project.primaryCategory}</span>
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
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (gate.state !== "ready") {
                        setShowWalletGate(true);
                        return;
                      }
                      setIsClaiming(true);
                    }}
                  >
                    Claim Ownership
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900"
                    onClick={() => {
                      if (gate.state !== "ready") {
                        setShowWalletGate(true);
                        return;
                      }
                      setIsReporting(true);
                    }}
                  >
                    Report Project
                  </Button>

                  {isOwner && (
                    <Button
                      variant="outline"
                      className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                      onClick={() => setShowTransferModal(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Transfer Ownership
                    </Button>
                  )}
                </div>
              </div>

              {/* Owner Address Display */}
              {project.ownerAddress && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                  <h3 className="text-lg font-bold mb-4">Owner</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono break-all">
                    {abbreviateStellarAddress(project.ownerAddress)}
                  </p>
                </div>
              )}

              {/* Contract Addresses */}
              {project.contractAddresses && project.contractAddresses.length > 0 && (
                <ContractAddressList addresses={project.contractAddresses} />
              )}
            </div>
          </div>
        </div>

        <ClaimProjectModal
          isOpen={isClaiming}
          projectName={project?.name || ""}
          onClose={() => setIsClaiming(false)}
          onSubmit={handleClaimSubmit}
        />
        <ReportProjectModal
          isOpen={isReporting}
          projectName={project?.name || ""}
          onClose={() => setIsReporting(false)}
          onSubmit={handleReportSubmit}
        />
        <ReportReviewModal
          isOpen={isReportingReview}
          review={reportingReview!}
          onClose={() => {
            setIsReportingReview(false);
            setReportingReview(null);
          }}
          onSubmit={handleReportReviewSubmit}
        />
      </main>
  );
}
