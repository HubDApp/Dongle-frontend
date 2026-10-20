"use client";

/**
 * AdminDashboard
 *
 * Comprehensive admin panel with analytics, monitoring, and controls.
 * Sections: Overview, User Management, Project Management, Verification Queue,
 * Review Moderation, System Health, Audit Logs.
 */

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Shield,
  MessageSquare,
  Activity,
  ScrollText,
  Radio,
  Ban,
  Star,
  Megaphone,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Wifi,
  HardDrive,
  Server,
} from "lucide-react";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { formatDate } from "@/lib/date";

type DashboardSection =
  | "overview"
  | "users"
  | "projects"
  | "verification"
  | "moderation"
  | "system"
  | "audit";

interface SystemMetric {
  label: string;
  value: string;
  status: "healthy" | "warning" | "error";
  icon: React.ReactNode;
}

interface DashboardStats {
  totalUsers: number;
  activeProjects: number;
  pendingVerifications: number;
  pendingReviews: number;
  connectedUsers: number;
  activeTransactions: number;
  approvalRate: number;
  avgProcessingTime: string;
}

const SECTIONS: { id: DashboardSection; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "users", label: "User Management", icon: <Users className="w-4 h-4" /> },
  { id: "projects", label: "Project Management", icon: <FolderOpen className="w-4 h-4" /> },
  { id: "verification", label: "Verification Queue", icon: <Shield className="w-4 h-4" /> },
  { id: "moderation", label: "Review Moderation", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "system", label: "System Health", icon: <Activity className="w-4 h-4" /> },
  { id: "audit", label: "Audit Logs", icon: <ScrollText className="w-4 h-4" /> },
];

interface AdminDashboardProps {
  stats: DashboardStats;
  systemMetrics: SystemMetric[];
  onQuickAction: (action: string, target?: string) => void;
}

function statusColor(status: "healthy" | "warning" | "error"): string {
  switch (status) {
    case "healthy":
      return "text-green-500";
    case "warning":
      return "text-amber-500";
    case "error":
      return "text-red-500";
  }
}

export default function AdminDashboard({ stats, systemMetrics, onQuickAction }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <aside className="lg:w-64 shrink-0">
        <nav className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4">
          <h2 className="text-lg font-bold mb-4 px-2">Admin Panel</h2>
          <ul className="space-y-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {section.icon}
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 mt-4">
          <h3 className="text-sm font-semibold mb-3 px-2 text-zinc-500 dark:text-zinc-400">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onQuickAction("broadcast")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Megaphone className="w-4 h-4" />
              Broadcast Message
            </button>
            <button
              onClick={() => onQuickAction("feature_project")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Star className="w-4 h-4" />
              Feature Project
            </button>
            <button
              onClick={() => onQuickAction("ban_user")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Ban className="w-4 h-4" />
              Ban User
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {activeSection === "overview" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Overview</h2>

            {/* Key metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Users"
                value={stats.totalUsers.toLocaleString()}
                icon={<Users className="w-5 h-5" />}
              />
              <MetricCard
                label="Active Projects"
                value={stats.activeProjects.toLocaleString()}
                icon={<FolderOpen className="w-5 h-5" />}
              />
              <MetricCard
                label="Pending Verifications"
                value={stats.pendingVerifications.toLocaleString()}
                icon={<Shield className="w-5 h-5" />}
              />
              <MetricCard
                label="Pending Reviews"
                value={stats.pendingReviews.toLocaleString()}
                icon={<MessageSquare className="w-5 h-5" />}
              />
            </div>

            {/* Real-time metrics */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Radio className="w-5 h-5 text-violet-500" />
                  Real-Time Metrics
                </h3>
                <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  <RefreshCw className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Connected Users</p>
                  <p className="text-2xl font-bold">{stats.connectedUsers.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Active Transactions</p>
                  <p className="text-2xl font-bold">{stats.activeTransactions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Approval Rate</p>
                  <p className="text-2xl font-bold text-green-500">{stats.approvalRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Avg Processing Time</p>
                  <p className="text-2xl font-bold">{stats.avgProcessingTime}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "system" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">System Health</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemMetrics.map((metric, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {metric.icon}
                      <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{metric.label}</p>
                        <p className="font-semibold">{metric.value}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${statusColor(metric.status)}`}>
                      {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder for other sections */}
        {!["overview", "system"].includes(activeSection) && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              {SECTIONS.find((s) => s.id === activeSection)?.label} section
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
              Content loading or managed by dedicated components
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl text-violet-500">
          {icon}
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
