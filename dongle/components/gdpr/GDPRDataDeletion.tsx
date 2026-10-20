"use client";

import React, { useState, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { gdprService } from "@/services/gdpr/gdpr.service";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Trash2 } from "lucide-react";

interface GDPRDataDeletionProps {
  formType: string;
  formId: string;
  userId: string;
  onDeleted?: () => void;
}

export function GDPRDataDeletion({
  formType,
  formId,
  userId,
  onDeleted,
}: GDPRDataDeletionProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      gdprService.deleteUserData(formType, formId, userId);
      setDeleted(true);
      onDeleted?.();
      setTimeout(() => {
        setDeleted(false);
        setDialogOpen(false);
      }, 3000);
    } catch (err) {
      console.error("[GDPRDataDeletion] Deletion failed:", err);
    } finally {
      setDeleting(false);
    }
  }, [formType, formId, userId, onDeleted]);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setDialogOpen(true)}
        leftIcon={<Trash2 className="w-4 h-4" />}
      >
        {t("gdpr.deletion.button")}
      </Button>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={t("gdpr.deletion.dialogTitle")}
        description={t("gdpr.deletion.dialogDescription")}
        confirmLabel={t("gdpr.deletion.confirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="danger"
      />

      {deleted && (
        <div className="mt-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {t("gdpr.deletion.success")}
        </div>
      )}
    </>
  );
}
