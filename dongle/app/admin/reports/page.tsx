"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Mail, Printer } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import WalletStatePanel, { WalletStateLoadingPanel } from "@/components/wallet/WalletStatePanel";
import AdminNav from "@/components/admin/AdminNav";
import ReportBuilder from "@/components/admin/ReportBuilder";
import {
  adminReportService,
  type AdminReport,
  type ReportSchedule,
  type ReportType,
} from "@/services/admin/admin-report.service";

const TABS: ReportType[] = ["daily", "weekly", "monthly"];

export default function AdminReportsPage() {
  const { isAdmin, isAdminChecking, gate } = useAdminAccess();
  const [activeType, setActiveType] = useState<Exclude<ReportType, "custom">>("daily");
  const [report, setReport] = useState<AdminReport | null>(null);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [email, setEmail] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setSchedules(adminReportService.getSchedules());
    const history = adminReportService.history();
    if (history.length > 0) setReport(history[0]);
  }, [isAdmin]);

  if (isAdminChecking || gate.state !== "ready") {
    return (
      <div className="container mx-auto px-4 py-32 max-w-2xl min-h-screen">
        {isAdminChecking || gate.state === "account-loading" ? (
          <WalletStateLoadingPanel message="Verifying admin access..." />
        ) : (
          <WalletStatePanel
            state={gate.state}
            pagePurpose="Connect an authorized admin wallet to view scheduled reports."
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

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-32 text-center min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
        <p className="text-zinc-500">Connect an authorized admin wallet to view reports.</p>
      </div>
    );
  }

  const build = (type: ReportType, metrics?: string[], from?: string, to?: string) => {
    setIsBuilding(true);
    try {
      const next =
        type === "custom"
          ? adminReportService.generate("custom", { metrics: metrics ?? [], from: from ?? "", to: to ?? "" })
          : adminReportService.generate(type);
      setReport(next);
      toast.success(`${next.title} generated`);
    } finally {
      setIsBuilding(false);
    }
  };

  const toggleSchedule = (schedule: ReportSchedule) => {
    adminReportService.saveSchedule({ ...schedule, enabled: !schedule.enabled });
    setSchedules(adminReportService.getSchedules());
    toast.success(`Scheduled ${schedule.type} reports ${schedule.enabled ? "paused" : "enabled"}`);
  };

  const sendEmail = () => {
    if (!report) return;
    const target = email.trim();
    if (!target) {
      toast.error("Enter a recipient email first");
      return;
    }
    const result = adminReportService.queueEmailDelivery(report, target);
    toast.success("Report email queued", { description: result.reason });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-black tracking-tight mb-2">ADMIN REPORTS</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Daily, weekly, and monthly metrics with alerts and exports.</p>
        </header>
        <AdminNav />

        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Report types">
          {TABS.map((type) => (
            <button
              key={type}
              role="tab"
              aria-selected={activeType === type}
              onClick={() => {
                setActiveType(type);
                build(type);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${
                activeType === type
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {report && (
          <section aria-label="Generated report" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold">{report.title}</h2>
                <p className="text-xs text-zinc-500 font-mono">Generated {report.generatedAt}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    adminReportService.download(`${report.id}.csv`, adminReportService.exportCsv(report), "text/csv");
                    toast.success("Exported as CSV");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button
                  onClick={() => adminReportService.printPdf(report)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {report.metrics.map((metric) => (
                <div key={metric.key} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                  <p className="text-xs uppercase font-bold text-zinc-500">{metric.label}</p>
                  <p className="text-2xl font-black">{String(metric.value)}</p>
                  {metric.delta && <p className="text-xs text-zinc-500">{metric.delta}</p>}
                </div>
              ))}
            </div>
            {report.alerts.length > 0 && (
              <ul className="space-y-2">
                {report.alerts.map((alert, i) => (
                  <li
                    key={i}
                    className={`text-sm px-4 py-2 rounded-xl ${
                      alert.level === "critical"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : alert.level === "warning"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {alert.message}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                aria-label="Report recipient email"
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
              />
              <button
                onClick={sendEmail}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl text-sm font-bold"
              >
                <Mail className="w-4 h-4" /> Email report
              </button>
            </div>
          </section>
        )}

        <section aria-label="Report schedules" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl mb-6">
          <h2 className="text-lg font-bold mb-1">Schedule</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Automate daily, weekly, and monthly generation with email delivery.</p>
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.type} className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-sm font-bold capitalize">{schedule.type}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${schedule.type} send time`}
                    value={schedule.sendTime}
                    onChange={(e) => {
                      adminReportService.saveSchedule({ ...schedule, sendTime: e.target.value });
                      setSchedules(adminReportService.getSchedules());
                    }}
                    className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
                  />
                  <button
                    role="switch"
                    aria-checked={schedule.enabled}
                    aria-label={`Enable scheduled ${schedule.type} reports`}
                    onClick={() => toggleSchedule(schedule)}
                    className={`relative w-11 h-6 rounded-full ${schedule.enabled ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${schedule.enabled ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ReportBuilder
          isBuilding={isBuilding}
          onBuild={(metrics, from, to) => build("custom", metrics, from, to)}
        />
      </div>
    </div>
  );
}
