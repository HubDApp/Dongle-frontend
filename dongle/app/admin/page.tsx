"use client";
import {
  ProjectReport,
  ProjectClaimRequest,
  ProjectModerationAction,
  ProjectSubmission,
} from "@/types/project";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import AddressDisplay from "@/components/ui/AddressDisplay";
import WalletStatePanel, {
  WalletStateLoadingPanel,
} from "@/components/wallet/WalletStatePanel";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useConfirm } from "@/hooks/useConfirm";
import { formatDate } from "@/lib/date";
import {
  AlertCircle,
  Archive,
  CheckCheck,
  CheckCircle,
  Clock,
  Flag,
  MessageSquare,
  Package,
  ScrollText,
  Shield,
  User,
  UserMinus,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { reviewReportService } from "@/services/review/review-report.service";
import { projectReportService } from "@/services/project/project-report.service";
import { projectClaimService } from "@/services/project/project-claim.service";
import { projectSubmissionService } from "@/services/project/project-submission.service";
import { projectService } from "@/services/project/project.service";
import { reviewService } from "@/services/review/review.service";
import { auditLogService } from "@/services/audit/audit-log.service";
import {
  verificationService,
  type VerificationRequest,
} from "@/services/stellar/verification.service";
import { ReviewReport, ModerationAction, Review } from "@/types/review";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import { ReviewModerationQueue } from "@/components/moderation/ReviewModerationQueue";
import Pagination from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";

type BulkAction = "approve" | "reject" | "archive" | "assign";

interface BulkActionResult {
  action: BulkAction;
  succeeded: string[];
  failed: { id: string; reason: string }[];
}

const ADMIN_PURPOSE =
  "Connect an authorized admin Freighter wallet to manage verification requests, review reports, and system settings.";

const VERIFICATION_STATUS_STYLES: Record<VerificationRequest["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500",
  VERIFIED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500",
  NONE: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400",
};

const SUBMISSION_STATUS_STYLES: Record<ProjectSubmission["status"], string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500",
  flagged: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500",
};

const BULK_ACTION_CONFIG: Record<BulkAction, { label: string; icon: React.ReactNode; confirmTitle: string; confirmDescription: (count: number) => string }> = {
  approve: {
    label: "Approve Selected",
    icon: <CheckCheck className="w-4 h-4" />,
    confirmTitle: "Approve requests?",
    confirmDescription: (count) => `Are you sure you want to approve ${count} verification request${count !== 1 ? "s" : ""}? This will mark them as verified.`,
  },
  reject: {
    label: "Reject Selected",
    icon: <X className="w-4 h-4" />,
    confirmTitle: "Reject requests?",
    confirmDescription: (count) => `Are you sure you want to reject ${count} verification request${count !== 1 ? "s" : ""}? The submitters will be notified.`,
  },
  archive: {
    label: "Archive Selected",
    icon: <Archive className="w-4 h-4" />,
    confirmTitle: "Archive requests?",
    confirmDescription: (count) => `Are you sure you want to archive ${count} verification request${count !== 1 ? "s" : ""}? Archived items are hidden from the active queue.`,
  },
  assign: {
    label: "Assign to Me",
    icon: <UserPlus className="w-4 h-4" />,
    confirmTitle: "Assign requests?",
    confirmDescription: (count) => `Are you sure you want to assign ${count} verification request${count !== 1 ? "s" : ""} to yourself?`,
  },
};

function BulkFailureDetail({ result }: { result: BulkActionResult }) {
  if (result.failed.length === 0) return null;

  return (
    <div className="mt-2 text-xs">
      <p className="font-medium mb-1">Failed ({result.failed.length}):</p>
      <ul className="list-disc list-inside space-y-0.5 text-zinc-500">
        {result.failed.map((f) => (
          <li key={f.id}>
            <span className="font-mono">{f.id}</span>: {f.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

function reportBulkActionResult(result: BulkActionResult) {
  const actionLabel = BULK_ACTION_CONFIG[result.action].label;
  if (result.succeeded.length > 0 && result.failed.length === 0) {
    toast.success(`${actionLabel}: ${result.succeeded.length} succeeded`, {
      description: `All ${result.succeeded.length} request${result.succeeded.length !== 1 ? "s" : ""} processed successfully.`,
    });
  } else if (result.succeeded.length > 0 && result.failed.length > 0) {
    toast.warning(`${actionLabel}: ${result.succeeded.length} succeeded, ${result.failed.length} failed`, {
      description: "Some requests could not be processed.",
      duration: 8000,
    });
    toast.error(`Partial failure details`, {
      description: <BulkFailureDetail result={result} />,
      duration: 10000,
    });
  } else {
    toast.error(`${actionLabel}: All ${result.failed.length} failed`, {
      description: "None of the selected requests could be processed.",
      duration: 8000,
    });
    toast.error(`Failure details`, {
      description: <BulkFailureDetail result={result} />,
      duration: 10000,
    });
  }
}

export default function AdminDashboard() {
  const { isAdmin, isAdminChecking, gate } = useAdminAccess();
  const confirm = useConfirm();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [verificationStats, setVerificationStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  });
  const [fee, setFee] = useState(1.5);
  const [activeTab, setActiveTab] = useState<
    "verification" | "submissions" | "reports" | "claims" | "audit-log" | "spam-queue"
  >("verification");
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [projectReports, setProjectReports] = useState<ProjectReport[]>([]);
  const [claimRequests, setClaimRequests] = useState<ProjectClaimRequest[]>([]);
  const [moderationLog, setModerationLog] = useState<ModerationAction[]>([]);
  const [projectModerationLog, setProjectModerationLog] = useState<ProjectModerationAction[]>([]);
  const [reviewsById, setReviewsById] = useState<Record<string, Review>>({});
  // Reason input states
  const [moderationReason, setModerationReason] = useState<Record<string, string>>({});
  const [verificationReason, setVerificationReason] = useState<Record<string, string>>({});
  const [claimReason, setClaimReason] = useState<Record<string, string>>({});
  const [projectReportReason, setProjectReportReason] = useState<Record<string, string>>({});
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [submissionReason, setSubmissionReason] = useState<Record<string, string>>({});
  const [verificationFilter, setVerificationFilter] = useState<"all" | "assigned-to-me" | "unassigned">("all");
  const [reportFilter, setReportFilter] = useState<"all" | "assigned-to-me" | "unassigned">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const reloadVerificationRequests = useCallback(async () => {
    const [allRequests, stats] = await Promise.all([
      verificationService.getAllRequests(),
      verificationService.getStats(),
    ]);
    setRequests(allRequests);
    setVerificationStats(stats);
  }, []);

  const reloadSubmissions = useCallback(() => {
    setSubmissions(projectSubmissionService.getAllSubmissions());
  }, []);

  // Load reports, reviews, verification requests, and moderation log
  useEffect(() => {
    if (!isAdmin) return;
    const id = setTimeout(() => {
      void reviewService.getReviews().then(setReviews);
      setReports(reviewReportService.getReports());
      setProjectReports(projectReportService.getReports());
      setClaimRequests(projectClaimService.getRequests());
      setModerationLog(reviewReportService.getModerationLog());
      setProjectModerationLog(projectReportService.getModerationLog());
      void reloadVerificationRequests();
      reloadSubmissions();
    }, 0);
    return () => clearTimeout(id);
  }, [isAdmin, reloadVerificationRequests, reloadSubmissions]);

  const handleAction = async (
    projectId: string,
    status: "approved" | "rejected",
    reason?: string,
  ) => {
    const req = requests.find((r) => r.projectId === projectId);
    if (!reason?.trim() && status === "rejected") {
      toast.error("A reason is required for rejection");
      return;
    }
    if (!gate.publicKey || !req) return;

    try {
      if (status === "approved") {
        await verificationService.approveRequest(projectId, gate.publicKey);
      } else {
        await verificationService.rejectRequest(
          projectId,
          gate.publicKey,
          reason?.trim(),
        );
      }

      auditLogService.append({
        actor: gate.publicKey,
        action: status === "approved" ? "verification_approved" : "verification_rejected",
        targetId: req.id,
        targetLabel: req.projectName,
        reason: reason?.trim() || undefined,
      });

      await reloadVerificationRequests();
      toast.success(`Verification ${status === "approved" ? "approved" : "rejected"}`);
      setVerificationReason((prev) => ({ ...prev, [projectId]: "" }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update verification request",
      );
    }
  };

  const handleSubmissionAction = (
    projectId: string,
    status: "approved" | "rejected" | "flagged",
    reason?: string,
  ) => {
    if ((status === "rejected" || status === "flagged") && !reason?.trim()) {
      toast.error("A reason is required");
      return;
    }
    if (!gate.publicKey) return;

    const result = projectSubmissionService.updateStatus(
      projectId,
      status,
      gate.publicKey,
      reason?.trim(),
    );

    if (result.success) {
      auditLogService.append({
        actor: gate.publicKey,
        action: "submission_moderated",
        targetId: projectId,
        targetLabel: result.submission?.projectName ?? projectId,
        reason: reason?.trim() || `Marked as ${status}`,
        metadata: { status },
      });
      reloadSubmissions();
      toast.success(`Submission ${status}`);
      setSubmissionReason((prev) => ({ ...prev, [projectId]: "" }));
    } else {
      toast.error(result.error || "Failed to update submission");
    }
  };

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelectable = requests
        .filter((r) => r.status === "PENDING")
        .map((r) => r.id);
      if (allSelectable.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(allSelectable);
    });
  }, [requests]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkAction = useCallback(async (action: BulkAction) => {
    const config = BULK_ACTION_CONFIG[action];
    const count = selectedIds.size;

    if (count === 0) return;

    const confirmed = await confirm({
      title: config.confirmTitle,
      description: config.confirmDescription(count),
      variant: action === "reject" ? "danger" : "warning",
      confirmLabel: action === "approve" ? "Approve All"
        : action === "reject" ? "Reject All"
        : action === "archive" ? "Archive All"
        : "Assign All",
    });

    if (!confirmed || !gate.publicKey) return;

    setIsBulkProcessing(true);

    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const id of selectedIds) {
      const request = requests.find((req) => req.id === id);
      if (!request) {
        failed.push({ id, reason: "Request not found" });
        continue;
      }

      try {
        if (request.status !== "PENDING") {
          failed.push({
            id,
            reason: `Cannot ${action} request with status "${request.status}"`,
          });
          continue;
        }

        if (action === "approve") {
          await verificationService.approveRequest(request.projectId, gate.publicKey);
        } else if (action === "reject" || action === "archive") {
          await verificationService.rejectRequest(
            request.projectId,
            gate.publicKey,
            action === "archive" ? "Archived by admin" : "Rejected by admin",
          );
        } else {
          await verificationService.assignRequest(
            request.projectId,
            gate.publicKey,
            gate.publicKey,
          );
        }
        succeeded.push(id);
      } catch (error) {
        failed.push({
          id,
          reason: error instanceof Error ? error.message : `Failed to ${action} request`,
        });
      }
    }

    await reloadVerificationRequests();
    setIsBulkProcessing(false);
    setSelectedIds(new Set());
    reportBulkActionResult({ action, succeeded, failed });
  }, [selectedIds, confirm, gate.publicKey, requests, reloadVerificationRequests]);

  const handleSaveFee = () => {
    if (gate.publicKey) {
      auditLogService.append({
        actor: gate.publicKey,
        action: "fee_updated",
        targetId: "verification_fee",
        targetLabel: "Verification Fee",
        metadata: { newValue: fee },
      });
    }
    toast.success(`Verification fee updated to ${fee} XLM`);
  };

  const handleResolveReport = (reportId: string) => {
    const reason = moderationReason[reportId]?.trim() || "Review content complies with guidelines";
    if (!gate.publicKey) return;

    const result = reviewReportService.resolveReport(reportId, gate.publicKey, reason);
    if (result.success) {
      auditLogService.append({
        actor: gate.publicKey,
        action: "report_resolved",
        targetId: reportId,
        targetLabel: `Report ${reportId}`,
        reason,
      });
      toast.success("Report resolved successfully");
      setReports(reviewReportService.getReports());
      setModerationLog(reviewReportService.getModerationLog());
      setModerationReason((prev) => ({ ...prev, [reportId]: "" }));
    } else {
      toast.error(result.error || "Failed to resolve report");
    }
  };

  const handleDismissReport = (reportId: string) => {
    const reason = moderationReason[reportId]?.trim() || "Report does not violate guidelines";
    if (!gate.publicKey) return;

    const result = reviewReportService.dismissReport(reportId, gate.publicKey, reason);
    if (result.success) {
      auditLogService.append({
        actor: gate.publicKey,
        action: "report_dismissed",
        targetId: reportId,
        targetLabel: `Report ${reportId}`,
        reason,
      });
      toast.success("Report dismissed");
      setReports(reviewReportService.getReports());
      setModerationLog(reviewReportService.getModerationLog());
      setModerationReason((prev) => ({ ...prev, [reportId]: "" }));
    } else {
      toast.error(result.error || "Failed to dismiss report");
    }
  };

  const handleResolveProjectReport = (reportId: string) => {
    const reason =
      projectReportReason[reportId]?.trim() ||
      "Project content complies with guidelines";
    if (!gate.publicKey) return;

    const result = projectReportService.resolveReport(
      reportId,
      gate.publicKey,
      reason,
    );
    if (result.success) {
      auditLogService.append({
        actor: gate.publicKey,
        action: "report_resolved",
        targetId: reportId,
        targetLabel: `Project report ${reportId}`,
        reason,
      });
      toast.success("Project report resolved successfully");
      setProjectReports(projectReportService.getReports());
      setProjectModerationLog(projectReportService.getModerationLog());
      setProjectReportReason((prev) => ({ ...prev, [reportId]: "" }));
    } else {
      toast.error(result.error || "Failed to resolve project report");
    }
  };

  const handleDismissProjectReport = (reportId: string) => {
    const reason =
      projectReportReason[reportId]?.trim() ||
      "Report does not violate guidelines";
    if (!gate.publicKey) return;

    const result = projectReportService.dismissReport(
      reportId,
      gate.publicKey,
      reason,
    );
    if (result.success) {
      auditLogService.append({
        actor: gate.publicKey,
        action: "report_dismissed",
        targetId: reportId,
        targetLabel: `Project report ${reportId}`,
        reason,
      });
      toast.success("Project report dismissed");
      setProjectReports(projectReportService.getReports());
      setProjectModerationLog(projectReportService.getModerationLog());
      setProjectReportReason((prev) => ({ ...prev, [reportId]: "" }));
    } else {
      toast.error(result.error || "Failed to dismiss project report");
    }
  };

  const handleApproveClaim = (requestId: string) => {
    const reason = claimReason[requestId]?.trim() || "Claim approved by admin";
    if (!gate.publicKey) return;

    const result = projectClaimService.approveRequest(requestId, gate.publicKey, reason);
    if (result.success) {
      const claim = claimRequests.find((c) => c.id === requestId);
      auditLogService.append({
        actor: gate.publicKey,
        action: "claim_approved",
        targetId: requestId,
        targetLabel: claim?.projectId || "Project claim",
        reason,
      });
      toast.success("Claim approved");
      setClaimRequests(projectClaimService.getRequests());
      setClaimReason((prev) => ({ ...prev, [requestId]: "" }));
    } else {
      toast.error(result.error || "Failed to approve claim");
    }
  };

  const handleRejectClaim = (requestId: string) => {
    const reason = claimReason[requestId]?.trim();
    if (!reason) {
      toast.error("A reason is required for rejection");
      return;
    }
    if (!gate.publicKey) return;

    const result = projectClaimService.rejectRequest(requestId, gate.publicKey, reason);
    if (result.success) {
      const claim = claimRequests.find((c) => c.id === requestId);
      auditLogService.append({
        actor: gate.publicKey,
        action: "claim_rejected",
        targetId: requestId,
        targetLabel: claim?.projectId || "Project claim",
        reason,
      });
      toast.success("Claim rejected");
      setClaimRequests(projectClaimService.getRequests());
      setClaimReason((prev) => ({ ...prev, [requestId]: "" }));
    } else {
      toast.error(result.error || "Failed to reject claim");
    }
  };

  const handleAssignVerification = async (projectId: string, assignedTo: string) => {
    if (!gate.publicKey) return;

    try {
      await verificationService.assignRequest(projectId, gate.publicKey, assignedTo);
      auditLogService.append({
        actor: gate.publicKey,
        action: "verification_assigned",
        targetId: projectId,
        targetLabel: `Verification Request ${projectId}`,
        metadata: { assignedTo },
      });
      toast.success("Request assigned");
      await reloadVerificationRequests();
    } catch {
      toast.error("Failed to assign request");
    }
  };

  const handleUnassignVerification = async (projectId: string) => {
    if (!gate.publicKey) return;

    try {
      await verificationService.unassignRequest(projectId, gate.publicKey);
      auditLogService.append({
        actor: gate.publicKey,
        action: "verification_unassigned",
        targetId: projectId,
        targetLabel: `Verification Request ${projectId}`,
      });
      toast.success("Request unassigned");
      await reloadVerificationRequests();
    } catch {
      toast.error("Failed to unassign request");
    }
  };

  const handleAssignReport = (reportId: string, assignedTo: string) => {
    if (!gate.publicKey) return;

    const result = reviewReportService.assignReport(reportId, gate.publicKey, assignedTo);
    if (result.success) {
      auditLogService.append({
        actor: gate.publicKey,
        action: "report_assigned",
        targetId: reportId,
        targetLabel: `Report ${reportId}`,
        metadata: { assignedTo },
      });
      toast.success("Report assigned");
      setReports(reviewReportService.getReports());
    } else {
      toast.error(result.error || "Failed to assign report");
    }
  };

  const handleUnassignReport = (reportId: string) => {
    if (!gate.publicKey) return;

    const result = reviewReportService.unassignReport(reportId, gate.publicKey);
    if (result.success) {
      auditLogService.append({
        actor: gate.publicKey,
        action: "report_unassigned",
        targetId: reportId,
        targetLabel: `Report ${reportId}`,
      });
      toast.success("Report unassigned");
      setReports(reviewReportService.getReports());
    } else {
      toast.error(result.error || "Failed to unassign report");
    }
  };

  const getReviewForReport = (reviewId: string): Review | undefined => {
    return reviews.find((r) => r.id === reviewId);
  };

  const getModerationActionsForReport = (reportId: string): ModerationAction[] => {
    return moderationLog.filter((a) => a.reportId === reportId);
  };

  const pendingSubmissions = submissions.filter(
    (s) => s.status === "pending" || s.status === "flagged",
  );
  const pendingReports = reports.filter((r) => r.status === "pending");
  const resolvedReports = reports.filter((r) => r.status !== "pending");
  const pendingProjectReports = projectReports.filter((report) => report.status === "pending");
  const pendingClaimRequests = claimRequests.filter((request) => request.status === "pending");
  const resolvedProjectReports = projectReports.filter((report) => report.status !== "pending");

  // Pagination hooks
  const verificationPagination = usePagination({ items: requests, itemsPerPage: 10 });
  const reportsPagination = usePagination({ items: pendingReports, itemsPerPage: 10 });
  const projectReportsPagination = usePagination({ items: pendingProjectReports, itemsPerPage: 10 });
  const claimsPagination = usePagination({ items: pendingClaimRequests, itemsPerPage: 10 });

  if (gate.state !== "ready") {
    return (
      <div className="container mx-auto px-4 py-32 min-h-screen max-w-2xl">
        {isAdminChecking || gate.state === "account-loading" ? (
          <WalletStateLoadingPanel message="Verifying admin access..." />
        ) : (
          <WalletStatePanel
            state={gate.state}
            pagePurpose={ADMIN_PURPOSE}
            walletNetworkLabel={gate.walletNetworkLabel}
            publicKey={gate.publicKey}
            onConnect={gate.connectWallet}
            onDisconnect={gate.disconnectWallet}
            onRetry={gate.retryAccountLoad}
          />
        )}
      </div>
    );
  }

  // ── 2. Wallet ready but not in the admin allowlist ───────────────────────────
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center min-h-screen">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Your wallet is not on the admin allowlist. Please connect an authorized
          admin wallet to access this dashboard.
        </p>
        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-600 font-mono break-all max-w-sm">
          {gate.publicKey}
        </p>
      </div>
    );
  }

  // ── 3. Authorized — render dashboard ────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-2 tracking-tight">ADMIN DASHBOARD</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage ecosystem verification, review reports, and system parameters.
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("verification")}
            className={`pb-3 px-1 font-medium transition-colors relative ${
              activeTab === "verification"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Verification Requests
            {activeTab === "verification" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`pb-3 px-1 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "submissions"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Package className="w-4 h-4" />
            Submissions
            {pendingSubmissions.length > 0 && (
              <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingSubmissions.length}
              </span>
            )}
            {activeTab === "submissions" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`pb-3 px-1 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "reports"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Flag className="w-4 h-4" />
            Review Reports
            {(pendingReports.length + pendingProjectReports.length) > 0 && (
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingReports.length + pendingProjectReports.length}
              </span>
            )}
            {activeTab === "reports" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("claims")}
            className={`pb-3 px-1 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "claims"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Shield className="w-4 h-4" />
            Ownership Claims
            {pendingClaimRequests.length > 0 && (
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingClaimRequests.length}
              </span>
            )}
            {activeTab === "claims" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("spam-queue")}
            className={`pb-3 px-1 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "spam-queue"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Shield className="w-4 h-4" />
            Spam Queue
            {activeTab === "spam-queue" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("audit-log")}
            className={`pb-3 px-1 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "audit-log"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <ScrollText className="w-4 h-4" />
            Audit Log
            {activeTab === "audit-log" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        {activeTab === "verification" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-2 h-8 bg-purple-500 rounded-full" />
                  Verification Requests
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVerificationFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      verificationFilter === "all"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setVerificationFilter("assigned-to-me")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      verificationFilter === "assigned-to-me"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Assigned to me
                  </button>
                  <button
                    onClick={() => setVerificationFilter("unassigned")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      verificationFilter === "unassigned"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Unassigned
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {requests
                  .filter((req) => {
                    if (verificationFilter === "all") return true;
                    if (verificationFilter === "assigned-to-me") return req.assignedTo === gate.publicKey;
                    if (verificationFilter === "unassigned") return !req.assignedTo;
                    return true;
                  })
                  .map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{req.projectName}</h3>
                      <p className="text-xs text-zinc-400 font-mono mb-1">{req.projectId}</p>
                      <div className="text-xs text-zinc-500 font-mono flex items-center gap-1.5 flex-wrap">
                        <span>Submitted by:</span>
                        <AddressDisplay address={req.submittedBy} copyable={true} truncated={true} inline={true} />
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span>{formatDate(req.submittedAt, "short")}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${VERIFICATION_STATUS_STYLES[req.status]}`}
                        >
                          {req.status}
                        </span>
                        {req.assignedTo && (
                          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500">
                            Assigned to <AddressDisplay address={req.assignedTo} copyable={false} truncated={true} inline={true} />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      {req.assignedTo ? (
                        req.assignedTo === gate.publicKey ? (
                          <button
                            onClick={() => handleUnassignVerification(req.projectId)}
                            className="flex-1 md:flex-none px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <UserMinus className="w-4 h-4" />
                            Unassign
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssignVerification(req.projectId, gate.publicKey!)}
                            className="flex-1 md:flex-none px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <User className="w-4 h-4" />
                            Reassign to me
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleAssignVerification(req.projectId, gate.publicKey!)}
                          className="flex-1 md:flex-none px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          Assign to me
                        </button>
                      )}
                      {req.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleAction(req.projectId, "approved")}
                            className="flex-1 md:flex-none px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = verificationReason[req.projectId];
                              handleAction(req.projectId, "rejected", reason);
                            }}
                            className="flex-1 md:flex-none px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-500 rounded-full" />
                System Settings
              </h2>

              <div className="bg-zinc-950 text-white p-8 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />

                <h3 className="text-lg font-bold mb-6">Verification Fee</h3>
                <div className="space-y-4">
                  <div className="flex items-end gap-3">
                    <input
                      type="number"
                      value={fee}
                      onChange={(e) => setFee(parseFloat(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-2xl font-black w-full outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xl font-bold mb-3">XLM</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    This fee is charged to projects when they submit a verification request.
                  </p>
                  <button
                    onClick={handleSaveFee}
                    className="w-full py-4 bg-white text-black rounded-2xl font-black hover:bg-zinc-200 transition-colors"
                  >
                    UPDATE FEE
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
                <h3 className="font-bold mb-4">Stats Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Verified</div>
                    <div className="text-2xl font-black">{verificationStats.verified}</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Queue</div>
                    <div className="text-2xl font-black">{verificationStats.pending}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating bulk action bar */}
        {selectedIds.size > 0 && activeTab === "verification" && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-8 fade-in duration-200">
            <div className="bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3">
              <span className="text-sm text-zinc-400 font-medium whitespace-nowrap">
                {selectedIds.size} selected
              </span>
              <div className="w-px h-6 bg-zinc-800" />
              <div className="flex items-center gap-2">
                {(Object.entries(BULK_ACTION_CONFIG) as [BulkAction, typeof BULK_ACTION_CONFIG[BulkAction]][]).map(([action, config]) => (
                  <button
                    key={action}
                    onClick={() => handleBulkAction(action)}
                    disabled={isBulkProcessing}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${
                      action === "reject"
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                        : action === "approve"
                          ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {isBulkProcessing ? (
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      config.icon
                    )}
                    {config.label}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-zinc-800" />
              <button
                onClick={clearSelection}
                disabled={isBulkProcessing}
                className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                aria-label="Cancel selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-8 bg-orange-500 rounded-full" />
                Project Submission Moderation
                {pendingSubmissions.length > 0 && (
                  <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                    ({pendingSubmissions.length} in queue)
                  </span>
                )}
              </h2>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                <Package className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500">No project submissions to review yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{submission.projectName}</h3>
                        <p className="text-xs text-zinc-400 font-mono mb-2">{submission.projectId}</p>
                        <div className="text-xs text-zinc-500 flex items-center gap-1.5 flex-wrap mb-3">
                          <span>Submitted by:</span>
                          <AddressDisplay
                            address={submission.submittedBy}
                            copyable={true}
                            truncated={true}
                            inline={true}
                          />
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span>{formatDate(submission.submittedAt, "short")}</span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span>Quality: {submission.qualityScore}%</span>
                        </div>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${SUBMISSION_STATUS_STYLES[submission.status]}`}
                        >
                          {submission.status}
                        </span>
                        {submission.flagReasons.length > 0 && (
                          <ul className="mt-3 text-xs text-orange-600 dark:text-orange-400 space-y-1">
                            {submission.flagReasons.map((flag) => (
                              <li key={flag}>• {flag}</li>
                            ))}
                          </ul>
                        )}
                        {submission.rejectionReason && (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                            Reason: {submission.rejectionReason}
                          </p>
                        )}
                      </div>

                      {(submission.status === "pending" || submission.status === "flagged") && (
                        <div className="flex flex-col gap-2 w-full md:w-64">
                          <input
                            type="text"
                            placeholder="Reason (required for reject/flag)"
                            value={submissionReason[submission.projectId] || ""}
                            onChange={(e) =>
                              setSubmissionReason((prev) => ({
                                ...prev,
                                [submission.projectId]: e.target.value,
                              }))
                            }
                            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleSubmissionAction(submission.projectId, "approved")
                              }
                              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleSubmissionAction(
                                  submission.projectId,
                                  "rejected",
                                  submissionReason[submission.projectId],
                                )
                              }
                              className="flex-1 px-3 py-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold"
                            >
                              Reject
                            </button>
                            {submission.status !== "flagged" && (
                              <button
                                onClick={() =>
                                  handleSubmissionAction(
                                    submission.projectId,
                                    "flagged",
                                    submissionReason[submission.projectId],
                                  )
                                }
                                className="flex-1 px-3 py-2 bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white rounded-xl text-sm font-bold"
                              >
                                Flag
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-2 h-8 bg-red-500 rounded-full" />
                  Pending Reports
                  {(pendingReports.length + pendingProjectReports.length) > 0 && (
                    <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                      ({pendingReports.length + pendingProjectReports.length} pending)
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReportFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      reportFilter === "all"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setReportFilter("assigned-to-me")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      reportFilter === "assigned-to-me"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Assigned to me
                  </button>
                  <button
                    onClick={() => setReportFilter("unassigned")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      reportFilter === "unassigned"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Unassigned
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Ownership Claims
                  </h3>
                  {pendingClaimRequests.length > 0 && (
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {pendingClaimRequests.length} pending
                    </span>
                  )}
                </div>

                {pendingClaimRequests.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No pending ownership claims at the moment.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {pendingClaimRequests.map((request) => {
                      const project = projectService.getProjectById(request.projectId);
                      return (
                        <div key={request.id} className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="font-semibold text-sm">
                                  {project?.name || "Unknown project"}
                                </div>
                                <div className="text-xs text-zinc-500 mt-1">
                                  Requested by <AddressDisplay address={request.requestedBy} copyable={true} truncated={true} inline={true} /> • {formatDate(request.createdAt, "relative")}
                                </div>
                                <div className="mt-2 text-xs uppercase font-bold text-blue-600 dark:text-blue-400">
                                  {request.proofType}
                                </div>
                                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                                  {request.proofValue}
                                </div>
                                {request.explanation && (
                                  <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap">
                                    {request.explanation}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <textarea
                                placeholder="Reason for decision (required for rejection)"
                                value={claimReason[request.id] || ""}
                                onChange={(e) =>
                                  setClaimReason((prev) => ({
                                    ...prev,
                                    [request.id]: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                                rows={2}
                              />
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleApproveClaim(request.id)}
                                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectClaim(request.id)}
                                  className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {pendingReports.length === 0 && pendingProjectReports.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                  <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                    No pending reports
                  </p>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                    All reviews and projects are currently in good standing.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReports
                    .filter((report: ReviewReport) => {
                      if (reportFilter === "all") return true;
                      if (reportFilter === "assigned-to-me") return report.assignedTo === gate.publicKey;
                      if (reportFilter === "unassigned") return !report.assignedTo;
                      return true;
                    })
                    .map((report: ReviewReport) => {
                    const review = getReviewForReport(report.reviewId);
                    return (
                      <div
                        key={report.id}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl transition-all hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                              <Flag className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                <span>Reported Review</span>
                                <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-1.5 py-0.5 rounded-full uppercase">
                                  {report.reason}
                                </span>
                                {report.assignedTo && (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500 px-1.5 py-0.5 rounded-full uppercase">
                                    Assigned to <AddressDisplay address={report.assignedTo} copyable={false} truncated={true} inline={true} />
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-500">
                                Reported by <AddressDisplay address={report.reporterAddress} copyable={true} truncated={true} inline={true} /> • {formatDate(report.createdAt, "relative")}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {report.assignedTo ? (
                              report.assignedTo === gate.publicKey ? (
                                <button
                                  onClick={() => handleUnassignReport(report.id)}
                                  className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                  <UserMinus className="w-4 h-4" />
                                  Unassign
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAssignReport(report.id, gate.publicKey!)}
                                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                  <User className="w-4 h-4" />
                                  Reassign to me
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => handleAssignReport(report.id, gate.publicKey!)}
                                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                <User className="w-4 h-4" />
                                Assign to me
                              </button>
                            )}
                          </div>
                        </div>

                        {review && (
                          <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-zinc-400" />
                              <span className="text-sm font-medium">Review by <AddressDisplay address={review.userAddress} copyable={true} truncated={true} inline={true} /></span>
                              <span className="text-yellow-500 text-sm font-bold">({review.rating}/5)</span>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {review.comment}
                            </p>
                            <div className="text-xs text-zinc-500 mt-2">
                              Project: {review.projectName}
                            </div>
                          </div>
                        )}

                        {report.explanation && (
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Reporter&apos;s explanation:</p>
                            <p className="text-sm text-amber-800 dark:text-amber-300">{report.explanation}</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          <textarea
                            placeholder="Moderation reason (optional)"
                            value={moderationReason[report.id] || ""}
                            onChange={(e) =>
                              setModerationReason((prev) => ({
                                ...prev,
                                [report.id]: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolveReport(report.id)}
                              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Resolve
                            </button>
                            <button
                              onClick={() => handleDismissReport(report.id)}
                              className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {pendingProjectReports.length > 0 && (
                <div className="space-y-4 mt-8">
                  {pendingProjectReports.map((report) => {
                    const project = projectService.getProjectById(report.projectId);
                    return (
                      <div
                        key={report.id}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl transition-all hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                              <Flag className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                <span>Reported Project</span>
                                <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-1.5 py-0.5 rounded-full uppercase">
                                  {report.reason}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-500">
                                Reported by <AddressDisplay address={report.reporterAddress} copyable={true} truncated={true} inline={true} /> • {formatDate(report.createdAt, "relative")}
                              </div>
                            </div>
                          </div>
                        </div>

                        {project && (
                          <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-zinc-400" />
                              <span className="text-sm font-medium">Project: {project.name}</span>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {project.description}
                            </p>
                          </div>
                        )}

                        {report.explanation && (
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Reporter&apos;s explanation:</p>
                            <p className="text-sm text-amber-800 dark:text-amber-300">{report.explanation}</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          <textarea
                            placeholder="Moderation reason (optional)"
                            value={projectReportReason[report.id] || ""}
                            onChange={(e) =>
                              setProjectReportReason((prev) => ({
                                ...prev,
                                [report.id]: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolveProjectReport(report.id)}
                              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Resolve
                            </button>
                            <button
                              onClick={() => handleDismissProjectReport(report.id)}
                              className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Resolved Reports */}
              {(resolvedReports.length > 0 || resolvedProjectReports.length > 0) && (
                <div className="mt-10">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <span className="w-2 h-6 bg-zinc-400 rounded-full" />
                    Moderation History
                  </h3>
                  <div className="space-y-3">
                    {resolvedReports.map((report) => {
                      const actions = getModerationActionsForReport(report.id);
                      const lastAction = actions[actions.length - 1];
                      return (
                        <div
                          key={report.id}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {report.status === "resolved" ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-zinc-400" />
                              )}
                              <span className="text-sm font-medium">
                                Report {report.status}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {report.reason}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setExpandedReport(
                                  expandedReport === report.id ? null : report.id
                                )
                              }
                              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                            >
                              {expandedReport === report.id ? "Hide" : "Details"}
                            </button>
                          </div>

                          {expandedReport === report.id && (
                            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                              <div className="text-xs text-zinc-500">
                                Reported by: <AddressDisplay address={report.reporterAddress} copyable={true} truncated={true} inline={true} />
                              </div>
                              <div className="text-xs text-zinc-500">
                                Reported: {formatDate(report.createdAt, "short")}
                              </div>
                              {lastAction && (
                                <>
                                  <div className="text-xs text-zinc-500">
                                    Moderator: <AddressDisplay address={lastAction.moderatorAddress} copyable={true} truncated={true} inline={true} />
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    Action: {lastAction.action} • {formatDate(lastAction.timestamp, "short")}
                                  </div>
                                  {lastAction.reason && (
                                    <div className="text-xs text-zinc-500">
                                      Reason: {lastAction.reason}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {resolvedProjectReports.map((report) => {
                      const actions = projectModerationLog.filter((action) => action.reportId === report.id);
                      const lastAction = actions[actions.length - 1];
                      return (
                        <div
                          key={report.id}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {report.status === "resolved" ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-zinc-400" />
                              )}
                              <span className="text-sm font-medium">
                                Project report {report.status}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {report.reason}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setExpandedReport(
                                  expandedReport === report.id ? null : report.id
                                )
                              }
                              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                            >
                              {expandedReport === report.id ? "Hide" : "Details"}
                            </button>
                          </div>

                          {expandedReport === report.id && (
                            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                              <div className="text-xs text-zinc-500">
                                Reported by: <AddressDisplay address={report.reporterAddress} copyable={true} truncated={true} inline={true} />
                              </div>
                              <div className="text-xs text-zinc-500">
                                Reported: {formatDate(report.createdAt, "short")}
                              </div>
                              {lastAction && (
                                <>
                                  <div className="text-xs text-zinc-500">
                                    Moderator: <AddressDisplay address={lastAction.moderatorAddress} copyable={true} truncated={true} inline={true} />
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    Action: {lastAction.action} • {formatDate(lastAction.timestamp, "short")}
                                  </div>
                                  {lastAction.reason && (
                                    <div className="text-xs text-zinc-500">
                                      Reason: {lastAction.reason}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Reports Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Total Reports</span>
                    <span className="font-bold">{reports.length + projectReports.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Pending</span>
                    <span className="font-bold text-yellow-500">{pendingReports.length + pendingProjectReports.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Resolved</span>
                    <span className="font-bold text-green-500">
                      {reports.filter((r) => r.status === "resolved").length + projectReports.filter((r) => r.status === "resolved").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Dismissed</span>
                    <span className="font-bold text-zinc-500">
                      {reports.filter((r) => r.status === "dismissed").length + projectReports.filter((r) => r.status === "dismissed").length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Moderation
                </h3>
                {moderationLog.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No moderation actions taken yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {moderationLog.slice(0, 5).map((action) => (
                      <div key={action.id} className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {action.action === "resolved" ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-zinc-400" />
                          )}
                          <span className="font-medium capitalize">{action.action}</span>
                        </div>
                        <div className="text-zinc-500 mt-0.5">
                          by <AddressDisplay address={action.moderatorAddress} copyable={true} truncated={true} inline={true} />
                        </div>
                        <div className="text-zinc-400">{formatDate(action.timestamp, "relative")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === "claims" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Left column: pending + resolved claims ── */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-2 h-8 bg-blue-500 rounded-full" />
                  Ownership Claims
                  {pendingClaimRequests.length > 0 && (
                    <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                      ({pendingClaimRequests.length} pending)
                    </span>
                  )}
                </h2>
              </div>

              {/* Pending claims */}
              {pendingClaimRequests.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                  <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                    No pending ownership claims
                  </p>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                    All claims have been reviewed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingClaimRequests.map((request) => {
                    const project = projectService.getProjectById(request.projectId);
                    return (
                      <div
                        key={request.id}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl transition-all hover:shadow-lg"
                      >
                        <div className="flex flex-col gap-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-bold text-lg">
                                {project?.name || "Unknown project"}
                              </h3>
                              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                {request.projectId}
                              </p>
                              <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                <span>Claimed by:</span>
                                <AddressDisplay
                                  address={request.requestedBy}
                                  copyable={true}
                                  truncated={true}
                                  inline={true}
                                />
                                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                <span>{formatDate(request.createdAt, "relative")}</span>
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500">
                              Pending
                            </span>
                          </div>

                          {/* Proof section */}
                          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                            <div className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wide">
                              Proof type: {request.proofType.replace("_", " ")}
                            </div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 break-words whitespace-pre-wrap">
                              {request.proofValue}
                            </p>
                            {request.explanation && (
                              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                  Additional context:
                                </p>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                                  {request.explanation}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Decision area */}
                          <div className="space-y-2">
                            <textarea
                              placeholder="Decision note (required for rejection, optional for approval)"
                              value={claimReason[request.id] || ""}
                              onChange={(e) =>
                                setClaimReason((prev) => ({
                                  ...prev,
                                  [request.id]: e.target.value,
                                }))
                              }
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveClaim(request.id)}
                                className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve &amp; Transfer
                              </button>
                              <button
                                onClick={() => handleRejectClaim(request.id)}
                                className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Resolved claims history */}
              {claimRequests.filter((r) => r.status !== "pending").length > 0 && (
                <div className="mt-10">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <span className="w-2 h-6 bg-zinc-400 rounded-full" />
                    Claim History
                  </h3>
                  <div className="space-y-3">
                    {claimRequests
                      .filter((r) => r.status !== "pending")
                      .sort(
                        (a, b) =>
                          new Date(b.reviewedAt ?? b.createdAt).getTime() -
                          new Date(a.reviewedAt ?? a.createdAt).getTime()
                      )
                      .map((request) => {
                        const project = projectService.getProjectById(request.projectId);
                        return (
                          <div
                            key={request.id}
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 min-w-0">
                                {request.status === "approved" ? (
                                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <span className="text-sm font-medium">
                                    {project?.name || request.projectId}
                                  </span>
                                  <span
                                    className={`ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                      request.status === "approved"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500"
                                    }`}
                                  >
                                    {request.status}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs text-zinc-400 shrink-0">
                                {formatDate(request.reviewedAt ?? request.createdAt, "short")}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1.5 flex-wrap">
                              <span>Claimant:</span>
                              <AddressDisplay
                                address={request.requestedBy}
                                copyable={true}
                                truncated={true}
                                inline={true}
                              />
                              {request.reviewedBy && (
                                <>
                                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                  <span>Reviewed by:</span>
                                  <AddressDisplay
                                    address={request.reviewedBy}
                                    copyable={true}
                                    truncated={true}
                                    inline={true}
                                  />
                                </>
                              )}
                            </div>
                            {request.reviewNote && (
                              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Note: {request.reviewNote}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column: stats ── */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Claims Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Total</span>
                    <span className="font-bold">{claimRequests.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Pending</span>
                    <span className="font-bold text-yellow-500">{pendingClaimRequests.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Approved</span>
                    <span className="font-bold text-green-500">
                      {claimRequests.filter((r) => r.status === "approved").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Rejected</span>
                    <span className="font-bold text-red-500">
                      {claimRequests.filter((r) => r.status === "rejected").length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-5 rounded-2xl text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <p className="font-semibold">How claim approval works</p>
                <ul className="space-y-1 text-xs text-blue-600 dark:text-blue-400 list-disc list-inside">
                  <li>Review the submitted proof carefully.</li>
                  <li>Approving transfers ownership to the claimant&apos;s wallet.</li>
                  <li>Claimant is notified of your decision either way.</li>
                  <li>All decisions are recorded in the Audit Log.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "audit-log" && (
          <AuditLogViewer entries={auditLogService.list()} />
        )}

        {activeTab === "spam-queue" && gate.publicKey && (
          <ReviewModerationQueue moderatorAddress={gate.publicKey} />
        )}
      </div>
    </div>
  );
}