"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  formBackupService,
  type FormBackup,
  type ArchivedBackup,
  type ArchivePolicy,
} from "@/services/backup/form-backup.service";
import {
  trackFormBackupCreated,
  trackFormBackupRestored,
  trackFormBackupFailed,
  trackFormBackupRetentionCleaned,
  trackFormArchiveCreated,
  trackFormArchiveRestored,
  trackFormArchiveSearch,
  trackFormArchiveDeleted,
  trackFormArchiveRetentionCleaned,
} from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GDPRDataExport } from "@/components/gdpr/GDPRDataExport";
import { GDPRDataDeletion } from "@/components/gdpr/GDPRDataDeletion";
import {
  Clock,
  RotateCcw,
  Trash2,
  Download,
  Cloud,
  Settings,
  Archive,
  Search,
  RefreshCw,
} from "lucide-react";

interface FormBackupRecoveryProps {
  formType: string;
  formId: string;
  currentData: Record<string, unknown>;
  onRestore: (data: Record<string, unknown>) => void;
  backupIntervalMs?: number;
  maxBackups?: number;
  maxBackupAgeMs?: number;
  archiveAfterMs?: number;
  maxArchivedBackups?: number;
  maxArchivedAgeMs?: number;
  automatedArchivalEnabled?: boolean;
}

export function FormBackupRecovery({
  formType,
  formId,
  currentData,
  onRestore,
  backupIntervalMs = 30_000,
  maxBackups = 10,
  maxBackupAgeMs = 7 * 24 * 60 * 60 * 1000,
  archiveAfterMs = 24 * 60 * 60 * 1000,
  maxArchivedBackups = 50,
  maxArchivedAgeMs = 90 * 24 * 60 * 60 * 1000,
  automatedArchivalEnabled = true,
}: FormBackupRecoveryProps) {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<FormBackup[]>([]);
  const [archivedBackups, setArchivedBackups] = useState<ArchivedBackup[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<FormBackup | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<FormBackup | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [archiveConfigOpen, setArchiveConfigOpen] = useState(false);
  const [config, setConfig] = useState({
    backupIntervalMs,
    maxBackups,
    maxBackupAgeMs,
  });
  const [archiveConfig, setArchiveConfig] = useState<ArchivePolicy>({
    archiveAfterMs,
    maxArchivedBackups,
    maxArchivedAgeMs,
    automatedArchivalEnabled,
  });
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [lastArchivedTime, setLastArchivedTime] = useState<string | null>(null);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Load backups on mount and when form changes
  useEffect(() => {
    const loaded = formBackupService.getBackups(formType, formId);
    setBackups(loaded);
    if (loaded.length > 0) {
      setLastBackupTime(loaded[0].createdAt);
    }
  }, [formType, formId]);

  // Load archived backups on mount and when form changes
  useEffect(() => {
    const loaded = formBackupService.getArchivedBackups(formType, formId);
    setArchivedBackups(loaded);
    if (loaded.length > 0) {
      setLastArchivedTime(loaded[0].archivedAt);
    }
  }, [formType, formId]);

  // Start automatic backups
  useEffect(() => {
    formBackupService.updateConfig(config);
    formBackupService.startBackup(formType, formId, currentData);

    return () => {
      formBackupService.stopBackup(formType, formId);
    };
  }, [formType, formId, currentData, config]);

  // Update archive policy when config changes
  useEffect(() => {
    formBackupService.updateArchivePolicy(archiveConfig);
  }, [archiveConfig]);

  const handleCreateBackup = useCallback(async () => {
    setIsBackingUp(true);
    try {
      const backupId = formBackupService.createBackup(formType, formId, currentData);
      if (backupId) {
        trackFormBackupCreated({
          formType,
          formId,
          backupId,
          backupCount: backups.length + 1,
        });
        const updated = formBackupService.getBackups(formType, formId);
        setBackups(updated);
        if (updated.length > 0) {
          setLastBackupTime(updated[0].createdAt);
        }
      }
    } catch (err) {
      trackFormBackupFailed({
        formType,
        formId,
        errorCode: "backup_create_failed",
      });
      console.error("[FormBackupRecovery] Failed to create backup:", err);
    } finally {
      setIsBackingUp(false);
    }
  }, [formType, formId, currentData, backups.length]);

  const handleRestore = useCallback(
    (backup: FormBackup) => {
      const restored = formBackupService.restoreBackup(formType, formId, backup.id);
      if (restored) {
        const ageMs = Date.now() - new Date(backup.createdAt).getTime();
        trackFormBackupRestored({
          formType,
          formId,
          backupId: backup.id,
          restoredFromAgeMs: ageMs,
        });
        onRestore(restored);
        setRestoreDialogOpen(false);
        setSelectedBackup(null);
      } else {
        trackFormBackupFailed({
          formType,
          formId,
          errorCode: "backup_restore_failed",
        });
      }
    },
    [formType, formId, onRestore],
  );

  const handleDelete = useCallback(
    (backup: FormBackup) => {
      const success = formBackupService.deleteBackup(formType, formId, backup.id);
      if (success) {
        const updated = formBackupService.getBackups(formType, formId);
        setBackups(updated);
        setDeleteDialogOpen(false);
        setBackupToDelete(null);
      }
    },
    [formType, formId],
  );

  const handleCleanExpired = useCallback(() => {
    const removed = formBackupService.cleanExpiredBackups(formType, formId);
    if (removed > 0) {
      trackFormBackupRetentionCleaned({
        formType,
        formId,
        removedCount: removed,
        remainingCount: formBackupService.getBackups(formType, formId).length,
      });
    }
    const updated = formBackupService.getBackups(formType, formId);
    setBackups(updated);
  }, [formType, formId]);

  // ── Archive handlers ──────────────────────────────────

  const handleArchiveNow = useCallback(() => {
    setIsArchiving(true);
    try {
      const count = formBackupService.archiveBackups(formType, formId);
      if (count > 0) {
        trackFormArchiveCreated({
          formType,
          formId,
          backupId: "batch",
          archivedCount: count,
        });
      }
      refreshArchivedBackups();
    } catch (err) {
      console.error("[FormBackupRecovery] Failed to archive backups:", err);
    } finally {
      setIsArchiving(false);
    }
  }, [formType, formId]);

  const handleRunAutomatedArchival = useCallback(() => {
    setIsArchiving(true);
    try {
      const count = formBackupService.runAutomatedArchival();
      if (count > 0) {
        trackFormArchiveCreated({
          formType,
          formId,
          backupId: "automated",
          archivedCount: count,
        });
      }
      refreshArchivedBackups();
    } catch (err) {
      console.error("[FormBackupRecovery] Failed to run automated archival:", err);
    } finally {
      setIsArchiving(false);
    }
  }, [formType, formId]);

  const handleRestoreArchived = useCallback(
    (backup: ArchivedBackup) => {
      const restored = formBackupService.restoreArchivedBackup(formType, formId, backup.id);
      if (restored) {
        trackFormArchiveRestored({
          formType,
          formId,
          backupId: backup.id,
        });
        onRestore(restored);
      }
    },
    [formType, formId, onRestore],
  );

  const handleDeleteArchived = useCallback(
    (backup: ArchivedBackup) => {
      const success = formBackupService.deleteArchivedBackup(formType, formId, backup.id);
      if (success) {
        trackFormArchiveDeleted({
          formType,
          formId,
          backupId: backup.id,
        });
        refreshArchivedBackups();
      }
    },
    [formType, formId],
  );

  const handleCleanExpiredArchived = useCallback(() => {
    const removed = formBackupService.cleanExpiredArchivedBackups(formType, formId);
    if (removed > 0) {
      trackFormArchiveRetentionCleaned({
        formType,
        formId,
        removedCount: removed,
        remainingCount: formBackupService.getArchivedBackups(formType, formId).length,
      });
    }
    refreshArchivedBackups();
  }, [formType, formId]);

  const handleSearchArchived = useCallback(
    (query: string) => {
      setArchiveSearchQuery(query);
      if (query.trim()) {
        const results = formBackupService.searchArchivedBackups(formType, formId, query);
        setArchivedBackups(results);
        trackFormArchiveSearch({
          formType,
          formId,
          queryLength: query.length,
          resultCount: results.length,
        });
      } else {
        refreshArchivedBackups();
      }
    },
    [formType, formId],
  );

  const refreshArchivedBackups = useCallback(() => {
    const loaded = formBackupService.getArchivedBackups(formType, formId);
    setArchivedBackups(loaded);
    if (loaded.length > 0) {
      setLastArchivedTime(loaded[0].archivedAt);
    }
  }, [formType, formId]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatAge = (iso: string) => {
    const ageMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(ageMs / 60_000);
    if (minutes < 1) return t("analytics.backupRecovery.justNow");
    if (minutes < 60) return t("analytics.backupRecovery.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("analytics.backupRecovery.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("analytics.backupRecovery.daysAgo", { count: days });
  };

  const formatArchiveAge = (iso: string) => {
    const ageMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(ageMs / 60_000);
    if (minutes < 1) return t("analytics.formArchive.justNow");
    if (minutes < 60) return t("analytics.formArchive.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("analytics.formArchive.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("analytics.formArchive.daysAgo", { count: days });
  };

  const handleArchiveConfigReset = useCallback(() => {
    setArchiveConfig({
      archiveAfterMs,
      maxArchivedBackups,
      maxArchivedAgeMs,
      automatedArchivalEnabled,
    });
  }, [archiveAfterMs, maxArchivedBackups, maxArchivedAgeMs, automatedArchivalEnabled]);

  const handleBackupConfigReset = useCallback(() => {
    setConfig({ backupIntervalMs, maxBackups, maxBackupAgeMs });
  }, [backupIntervalMs, maxBackups, maxBackupAgeMs]);

  return (
    <Card className="mt-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          {t("analytics.backupRecovery.title")}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(!configOpen)}>
            <Settings className="w-4 h-4 mr-1" />
            {t("analytics.backupRecovery.configTitle")}
          </Button>
          <Button size="sm" onClick={handleCreateBackup} disabled={isBackingUp}>
            <Download className="w-4 h-4 mr-1" />
            {isBackingUp ? t("common.loading") : t("analytics.backupRecovery.createBackup")}
          </Button>
        </div>
      </div>

      {/* Config panel */}
      {configOpen && (
        <div className="mb-4 p-3 border rounded-lg space-y-3">
          <h4 className="text-sm font-medium">{t("analytics.backupRecovery.configTitle")}</h4>
          <div className="flex items-center gap-4">
            <label className="text-sm">
              {t("analytics.backupRecovery.backupInterval")}:
              <input
                type="number"
                className="ml-2 w-20 px-2 py-1 border rounded text-sm"
                value={config.backupIntervalMs}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, backupIntervalMs: Number(e.target.value) }))
                }
                min="5000"
                step="5000"
              />
              ms
            </label>
            <label className="text-sm">
              {t("analytics.backupRecovery.maxBackups")}:
              <input
                type="number"
                className="ml-2 w-16 px-2 py-1 border rounded text-sm"
                value={config.maxBackups}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, maxBackups: Number(e.target.value) }))
                }
                min="1"
                max="50"
              />
            </label>
            <label className="text-sm">
              {t("analytics.backupRecovery.retentionPeriod")}:
              <input
                type="number"
                className="ml-2 w-20 px-2 py-1 border rounded text-sm"
                value={config.maxBackupAgeMs}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, maxBackupAgeMs: Number(e.target.value) }))
                }
                min="86400000"
                step="86400000"
              />
              ms
            </label>
          </div>
          <Button variant="outline" size="sm" onClick={handleBackupConfigReset}>
            {t("analytics.backupRecovery.configReset")}
          </Button>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {lastBackupTime
            ? t("analytics.backupRecovery.lastBackup", { date: formatDate(lastBackupTime) })
            : t("analytics.backupRecovery.noBackups")}
        </span>
        <span>{t("analytics.backupRecovery.backupCount", { count: backups.length })}</span>
        <Button variant="ghost" size="sm" onClick={handleCleanExpired} className="ml-auto">
          {t("analytics.backupRecovery.retentionCleaned")}
        </Button>
      </div>

      {/* Backup list */}
      {backups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("analytics.backupRecovery.noBackups")}
        </p>
      ) : (
        <ul className="space-y-2">
          {backups.map((backup) => (
            <li
              key={backup.id}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(backup.createdAt)}</span>
                <span className="text-muted-foreground">({formatAge(backup.createdAt)})</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedBackup(backup);
                    setRestoreDialogOpen(true);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t("analytics.backupRecovery.restoreBackup")}
                </Button>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBackupToDelete(backup);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Archive Section ──────────────────────────── */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Archive className="w-4 h-4" />
            {t("analytics.formArchive.title")}
          </h4>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveConfigOpen(!archiveConfigOpen)}
            >
              <Settings className="w-4 h-4 mr-1" />
              {t("analytics.formArchive.configTitle")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunAutomatedArchival}
              disabled={isArchiving}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {isArchiving ? t("common.loading") : t("analytics.formArchive.archiveNow")}
            </Button>
          </div>
        </div>

        {/* Archive config panel */}
        {archiveConfigOpen && (
          <div className="mb-4 p-3 border rounded-lg space-y-3">
            <h5 className="text-sm font-medium">{t("analytics.formArchive.archivePolicy")}</h5>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-sm">
                {t("analytics.formArchive.archiveAfter")}:
                <input
                  type="number"
                  className="ml-2 w-20 px-2 py-1 border rounded text-sm"
                  value={archiveConfig.archiveAfterMs}
                  onChange={(e) =>
                    setArchiveConfig((c) => ({
                      ...c,
                      archiveAfterMs: Number(e.target.value),
                    }))
                  }
                  min="3600000"
                  step="3600000"
                />
                ms
              </label>
              <label className="text-sm">
                {t("analytics.formArchive.maxArchivedBackups")}:
                <input
                  type="number"
                  className="ml-2 w-16 px-2 py-1 border rounded text-sm"
                  value={archiveConfig.maxArchivedBackups}
                  onChange={(e) =>
                    setArchiveConfig((c) => ({
                      ...c,
                      maxArchivedBackups: Number(e.target.value),
                    }))
                  }
                  min="1"
                  max="200"
                />
              </label>
              <label className="text-sm">
                {t("analytics.formArchive.maxArchivedAge")}:
                <input
                  type="number"
                  className="ml-2 w-20 px-2 py-1 border rounded text-sm"
                  value={archiveConfig.maxArchivedAgeMs}
                  onChange={(e) =>
                    setArchiveConfig((c) => ({
                      ...c,
                      maxArchivedAgeMs: Number(e.target.value),
                    }))
                  }
                  min="86400000"
                  step="86400000"
                />
                ms
              </label>
              <label className="text-sm flex items-center gap-2">
                {t("analytics.formArchive.automatedArchival")}:
                <input
                  type="checkbox"
                  checked={archiveConfig.automatedArchivalEnabled}
                  onChange={(e) =>
                    setArchiveConfig((c) => ({
                      ...c,
                      automatedArchivalEnabled: e.target.checked,
                    }))
                  }
                />
              </label>
            </div>
            <Button variant="outline" size="sm" onClick={handleArchiveConfigReset}>
              {t("analytics.formArchive.configReset")}
            </Button>
          </div>
        )}

        {/* Archive status bar */}
        <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Archive className="w-4 h-4" />
            {lastArchivedTime
              ? t("analytics.formArchive.lastArchived", { date: formatDate(lastArchivedTime) })
              : t("analytics.formArchive.noArchivedBackups")}
          </span>
          <span>{t("analytics.formArchive.archivedCount", { count: archivedBackups.length })}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCleanExpiredArchived}
            className="ml-auto"
          >
            {t("analytics.formArchive.cleanExpiredArchived")}
          </Button>
        </div>

        {/* Archive search */}
        <div className="mb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 border rounded text-sm"
              placeholder={t("analytics.formArchive.searchPlaceholder")}
              value={archiveSearchQuery}
              onChange={(e) => handleSearchArchived(e.target.value)}
            />
          </div>
        </div>

        {/* Archive tabs */}
        <div className="flex items-center gap-4 mb-3 border-b">
          <button
            className={`pb-2 text-sm font-medium ${
              activeTab === "active"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("active")}
          >
            {t("analytics.backupRecovery.title")}
          </button>
          <button
            className={`pb-2 text-sm font-medium ${
              activeTab === "archived"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("archived")}
          >
            {t("analytics.formArchive.archivedBackups")}
          </button>
        </div>

        {/* Archived backup list */}
        {activeTab === "archived" && archivedBackups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("analytics.formArchive.noArchivedBackups")}
          </p>
        ) : (
          activeTab === "archived" && (
            <ul className="space-y-2">
              {archivedBackups.map((backup) => (
                <li
                  key={backup.id}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(backup.archivedAt)}</span>
                    <span className="text-muted-foreground">
                      ({formatArchiveAge(backup.archivedAt)})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("analytics.formArchive.archivedBy", {
                        reason: backup.archivedBy,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestoreArchived(backup)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      {t("analytics.formArchive.restoreFromArchive")}
                    </Button>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteArchived(backup)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {/* Restore confirmation dialog (active backups) */}
      <ConfirmDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        title={t("analytics.backupRecovery.restoreConfirm")}
        description={
          selectedBackup
            ? t("analytics.backupRecovery.restoreFrom", { id: selectedBackup.id })
            : ""
        }
        confirmLabel={t("analytics.backupRecovery.restoreBackup")}
        cancelLabel={t("common.cancel")}
        variant="info"
        onConfirm={() => selectedBackup && handleRestore(selectedBackup)}
      />

      {/* Delete confirmation dialog (active backups) */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("analytics.backupRecovery.deleteConfirm")}
        description={
          backupToDelete
            ? t("analytics.backupRecovery.restoreFrom", { id: backupToDelete.id })
            : ""
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={() => backupToDelete && handleDelete(backupToDelete)}
      />

      {/* GDPR Data Export & Deletion */}
      <div className="mt-4 pt-4 border-t flex items-center gap-3">
        <GDPRDataExport
          formType={formType}
          formId={formId}
          userId="anonymous"
          formData={currentData}
        />
        <GDPRDataDeletion
          formType={formType}
          formId={formId}
          userId="anonymous"
        />
      </div>
    </Card>
  );
}
