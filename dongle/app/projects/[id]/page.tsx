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
import { RepositoryMetadata } from "@/components/projects/RepositoryMetadata";
import { Review } from "@/types/review";
import { formatDate } from "@/lib/date";
import { reviewService } from "@/services/review/review.service";
import { sorobanService } from "@/services/stellar/soroban.service";
import { extractDomain } from "@/lib/url";
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
  Info,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ReportProjectModal } from "@/components/projects/ReportProjectModal";
import { useSavedProjects } from "@/hooks/useSavedProjects";
  Shield,
  Bug,
} from "lucide-react";
import { toast } from "sonner";
import { ReportProjectModal } from "@/components/projects/ReportProjectModal";
import { updateService } from "@/services/update/update.service";
import { ProjectUpdate, UpdateType } from "@/types/update";
import UpdateList from "@/components/updates/UpdateList";
import UpdateForm from "@/components/updates/UpdateForm";

const PROJECT_REVIEW_PURPOSE =
  "Connect Freighter to write or manage reviews for this project.";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gate = useWalletPageGate();
  const confirm = useConfirm();
  const { isProjectSaved, toggleSavedProject, canManageSavedProjects } = useSavedProjects();
  const projectId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ReturnType<typeof projectService.getProjectById>>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showWalletGate, setShowWalletGate] = useState(false);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reviewSort, setReviewSort] = useState<"newest" | "highest" | "lowest" | "mine">("newest");
  const [verificationStatus, setVerificationStatus] = useState<"NONE" | "PENDING" | "VERIFIED" | "REJECTED" | null>(null);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<ProjectUpdate | null>(null);
  const [activeTab, setActiveTab] = useState<"about" | "updates">("about");

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      const foundProject = projectService.getProjectById(projectId);
      setProject(foundProject);

      // Load reviews from shared service
      if (foundProject) {
        setReviews(reviewService.getReviewsByProject(foundProject.id));
        setUpdates(updateService.getUpdatesByProject(foundProject.id));
        // Fetch verification status
        void (async () => {
          try {
            const status = await sorobanService.getVerificationStatus(projectId);
            setVerificationStatus(status);
          } catch (error) {
            console.error("Failed to fetch verification status:", error);
            setVerificationStatus("NONE");
          }
        })();
      }

      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [projectId]);

  const isOwner = project && gate.publicKey && project.ownerAddress === gate.publicKey;
  const isSaved = project ? isProjectSaved(project.id) : false;

  const handleToggleSaved = () => {
    if (!project) return;
    if (!canManageSavedProjects) {
      setShowWalletGate(true);
      return;
    }

    const nextSaved = toggleSavedProject(project.id);
    toast.success(nextSaved ? "Saved project" : "Removed from saved projects");
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
    console.log("Reported:", project?.id, data);
    setIsReporting(false);
    toast.success("Project reported successfully");
  };

  const ratingDistribution = React.useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        dist[r.rating as keyof typeof dist]++;
      }
    });
    return dist;
  }, [reviews]);

  const sortedReviews = React.useMemo(() => {
    let list = [...reviews];
    if (reviewSort === "mine") {
      list = list.filter((r) => r.userAddress === gate.publicKey);
    } else if (reviewSort === "highest") {
      list.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (reviewSort === "lowest") {
      list.sort((a, b) => a.rating - b.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [reviews, reviewSort, gate.publicKey]);

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
    } catch (error) {
      toast.error("Failed to delete update");
    }
  };

  const handleExternalLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault();
    
    // Check if the domain is verified and can bypass the warning
    // Verified project domains can bypass the warning if approved (i.e. verificationStatus is VERIFIED).
    const targetDomain = extractDomain(url);
    const isVerifiedDomain = verificationStatus === "VERIFIED";

    if (isVerifiedDomain) {
      // Bypass the warning and open link safely
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    // Otherwise, show confirmation interstitial/modal
    const ok = await confirm({
      title: "External Link Safety Warning",
      description: `You are about to visit the following external domain: ${targetDomain}.\nFull URL: ${url}\n\nMake sure you trust this site before proceeding.`,
      confirmLabel: "Proceed to Site",
      cancelLabel: "Stay Here",
      variant: "warning",
    });

    if (ok) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
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

          {/* Warning Banner */}
          {verificationStatus === "REJECTED" && (
            <div className="mb-6 p-5 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-3xl border border-red-200 dark:border-red-900/50 shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <h4 className="font-bold text-base mb-1">High Risk Warning: Rejected Project</h4>
                <p className="text-sm opacity-90 leading-relaxed">
                  This project was rejected by the community verification process. Please be extremely cautious: do not connect your wallet, share private keys, or interact with external links unless you are absolutely sure of its safety.
                </p>
              </div>
            </div>
          )}

          {(verificationStatus === "NONE" || verificationStatus === "PENDING") && (
            <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <Info className="w-6 h-6 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <h4 className="font-bold text-base mb-1">Unverified Project Context</h4>
                <p className="text-sm opacity-90 leading-relaxed">
                  This project has not completed the community verification process. It is currently unverified. Please exercise due diligence when interacting with the project and checking external resources.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Project Header */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-start justify-between mb-6 gap-4">
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
                  <Button
                    variant={isSaved ? "secondary" : "outline"}
                    onClick={handleToggleSaved}
                    disabled={!project}
                    leftIcon={isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    className="shrink-0"
                  >
                    {isSaved ? "Saved" : "Save"}
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
                      {isOwner && !isAddingUpdate && (
                        <Button variant="primary" onClick={handleAddUpdate}>
                          <Megaphone className="w-4 h-4 mr-2" />
                          Post Update
                        </Button>
                      )}

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
                        canManage={isOwner}
                        onEdit={handleEditUpdate}
                        onDelete={handleDeleteUpdate}
                      />
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3">
                  {project.websiteUrl && (
                    <a
                      href={project.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleExternalLinkClick(e, project.websiteUrl!)}
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
                      rel="noopener noreferrer"
                      onClick={(e) => handleExternalLinkClick(e, project.githubUrl!)}
                    >
                      <Button variant="outline" size="sm">
                        <GitBranch className="w-4 h-4 mr-2" />
                        GitHub
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  )}
                  {project.auditReportUrl && (
                    <a
                      href={project.auditReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleExternalLinkClick(e, project.auditReportUrl!)}
                    >
                      <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20">
                        <Shield className="w-4 h-4 mr-2" />
                        Audit Report
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  )}
                  {project.bugBountyUrl && (
                    <a
                      href={project.bugBountyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleExternalLinkClick(e, project.bugBountyUrl!)}
                    >
                      <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                        <Bug className="w-4 h-4 mr-2" />
                        Bug Bounty
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    Reviews
                  </h2>
                  <div className="flex gap-2">
                    <select
                      value={reviewSort}
                      onChange={(e) => setReviewSort(e.target.value as any)}
                      className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="newest">Newest First</option>
                      <option value="highest">Highest Rating</option>
                      <option value="lowest">Lowest Rating</option>
                      {gate.publicKey && <option value="mine">My Reviews</option>}
                    </select>
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

                {reviews.length > 0 && (
                  <div className="mb-8 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-8 items-center">
                    <div className="text-center md:text-left">
                      <div className="text-5xl font-black mb-1">{project?.rating}</div>
                      <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${star <= (project?.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-300 dark:text-zinc-700'}`} />
                        ))}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">{reviews.length} total reviews</div>
                    </div>
                    <div className="flex-1 w-full max-w-sm space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratingDistribution[star as keyof typeof ratingDistribution];
                        const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-3 text-sm">
                            <div className="w-12 text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                              {star} <Star className="w-3 h-3" />
                            </div>
                            <div className="flex-1 h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <div className="w-10 text-right text-zinc-500 dark:text-zinc-400">
                              {percentage}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                  reviews={sortedReviews}
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
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900"
                    onClick={() => setIsReporting(true)}
                  >
                    Report Project
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ReportProjectModal
          isOpen={isReporting}
          projectName={project?.name || ""}
          onClose={() => setIsReporting(false)}
          onSubmit={handleReportSubmit}
        />
      </main>
  );
}
