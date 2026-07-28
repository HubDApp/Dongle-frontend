"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import AddressDisplay from "@/components/ui/AddressDisplay";
import WalletStatePanel, {
  WalletStateLoadingPanel,
} from "@/components/wallet/WalletStatePanel";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { formatDate } from "@/lib/date";
import { AlertCircle, Flag, Shield, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { reviewReportService } from "@/services/review/review-report.service";
import { reviewService } from "@/services/review/review.service";
import { ReviewReport, ModerationAction, Review } from "@/types/review";

interface VerificationRequest {
  id: string;
  projectName: string;
  submittedBy: string;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
}

const MOCK_REQUESTS: VerificationRequest[] = [
  { id: "req_1", projectName: "Lumina DEX", submittedBy: "GABC...1234", status: "pending", timestamp: "2024-03-20T10:00:00Z" },
  { id: "req_2", projectName: "Stellar Stake", submittedBy: "GDEF...5678", status: "pending", timestamp: "2024-03-21T14:30:00Z" },
  { id: "req_3", projectName: "Orbit NFT", submittedBy: "GHIJ...9012", status: "approved", timestamp: "2024-03-19T09:15:00Z" },
];

const ADMIN_ALLOWLIST = (process.env.NEXT_PUBLIC_ADMIN_ALLOWLIST ?? "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

const ADMIN_PURPOSE =
  "Connect an authorized admin Freighter wallet to manage verification requests, review reports, and system settings.";

export default function AdminDashboard() {
  const gate = useWalletPageGate();
  const [requests, setRequests] = useState<VerificationRequest[]>(MOCK_REQUESTS);
  const [fee, setFee] = useState(1.5);
  const [activeTab, setActiveTab] = useState<"verification" | "reports">("verification");
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [moderationLog, setModerationLog] = useState<ModerationAction[]>([]);
  const [moderationReason, setModerationReason] = useState<Record<string, string>>({});
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const isAdmin = useMemo(
    () =>
      gate.state === "ready" &&
      Boolean(gate.publicKey) &&
      ADMIN_ALLOWLIST.includes(gate.publicKey!),
    [gate.state, gate.publicKey],
  );

  // Load reports and moderation log
  useEffect(() => {
    if (isAdmin) {
      setReports(reviewReportService.getReports());
      setModerationLog(reviewReportService.getModerationLog());
    }
  }, [isAdmin]);

  const handleAction = (id: string, status: "approved" | "rejected") => {
    setRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status } : req)),
    );
  };

  const handleSaveFee = () => {
    toast.success(`Verification fee updated to ${fee} XLM`);
  };

  const handleResolveReport = (reportId: string) => {
    const reason = moderationReason[reportId]?.trim() || "Review content complies with guidelines";
    if (!gate.publicKey) return;

    const result = reviewReportService.resolveReport(reportId, gate.publicKey, reason);
    if (result.success) {
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
      toast.success("Report dismissed");
      setReports(reviewReportService.getReports());
      setModerationLog(reviewReportService.getModerationLog());
      setModerationReason((prev) => ({ ...prev, [reportId]: "" }));
    } else {
      toast.error(result.error || "Failed to dismiss report");
    }
  };

  const getReviewForReport = (reviewId: string): Review | undefined => {
    return reviewService.getReviews().find((r) => r.id === reviewId);
  };

  const getModerationActionsForReport = (reportId: string): ModerationAction[] => {
    return moderationLog.filter((a) => a.reportId === reportId);
  };

  const pendingReports = reports.filter((r) => r.status === "pending");
  const resolvedReports = reports.filter((r) => r.status !== "pending");

  if (gate.state !== "ready") {
    return (
      <div className="container mx-auto px-4 py-32 min-h-screen max-w-2xl">
        {gate.state === "account-loading" ? (
          <WalletStateLoadingPanel message="Verifying wallet access..." />
        ) : (
          <WalletStatePanel
            state={gate.state}
            pagePurpose={ADMIN_PURPOSE}
            walletNetworkLabel={gate.walletNetworkLabel}
            publicKey={gate.publicKey}
            onConnect={gate.connectWallet}
            onDisconnect={gate.disconnectWallet}
          />
        )}
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
          Please connect an authorized admin wallet to access this dashboard.
        </p>
      </div>
    );
  }

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
            onClick={() => setActiveTab("reports")}
            className={`pb-3 px-1 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "reports"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Flag className="w-4 h-4" />
            Review Reports
            {pendingReports.length > 0 && (
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingReports.length}
              </span>
            )}
            {activeTab === "reports" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        {activeTab === "verification" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-8 bg-purple-500 rounded-full" />
                Verification Requests
              </h2>

              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-lg"
                  >
                    <div>
                      <h3 className="font-bold text-lg mb-1">{req.projectName}</h3>
                      <div className="text-xs text-zinc-500 font-mono flex items-center gap-1.5 flex-wrap">
                        <span>Submitted by:</span>
                        <AddressDisplay address={req.submittedBy} copyable={true} truncated={true} inline={true} />
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span>{formatDate(req.timestamp, "short")}</span>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                            req.status === "pending"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500"
                              : req.status === "approved"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {req.status === "pending" && (
                      <div className="flex gap-2 w-full md:w-auto">
                        <button
                          onClick={() => handleAction(req.id, "approved")}
                          className="flex-1 md:flex-none px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "rejected")}
                          className="flex-1 md:flex-none px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
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
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Active</div>
                    <div className="text-2xl font-black">24</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Queue</div>
                    <div className="text-2xl font-black">12</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-8 bg-red-500 rounded-full" />
                Pending Reports
                {pendingReports.length > 0 && (
                  <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                    ({pendingReports.length} pending)
                  </span>
                )}
              </h2>

              {pendingReports.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                  <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                    No pending reports
                  </p>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                    All reviews are currently in good standing.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReports.map((report) => {
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
                              </div>
                              <div className="text-xs text-zinc-500">
                                Reported by <AddressDisplay address={report.reporterAddress} copyable={true} truncated={true} inline={true} /> • {formatDate(report.createdAt, "relative")}
                              </div>
                            </div>
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
                </div>
              )}

              {/* Resolved Reports */}
              {resolvedReports.length > 0 && (
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
                  </div>
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
                    <span className="font-bold">{reports.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Pending</span>
                    <span className="font-bold text-yellow-500">{pendingReports.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Resolved</span>
                    <span className="font-bold text-green-500">
                      {reports.filter((r) => r.status === "resolved").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Dismissed</span>
                    <span className="font-bold text-zinc-500">
                      {reports.filter((r) => r.status === "dismissed").length}
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
      </div>
    </div>
  );
}
