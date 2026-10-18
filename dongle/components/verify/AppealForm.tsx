"use client";

/**
 * Appeal form for rejected verification requests (#687).
 *
 * Allows project owners to appeal a rejected verification with additional
 * evidence. Max 1 appeal per rejection, 30-day deadline from rejection.
 */

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { AlertCircle, Send, Clock } from "lucide-react";

interface AppealFormProps {
  projectId: string;
  rejectionReason: string;
  rejectedAt: string;
  existingAppeal?: {
    reason: string;
    submittedAt: string;
    status: "pending" | "approved" | "denied";
    decisionAt?: string;
  } | null;
  onSubmit: (reason: string, evidence: string) => Promise<void>;
}

const APPEAL_DEADLINE_DAYS = 30;

export function AppealForm({
  projectId,
  rejectionReason,
  rejectedAt,
  existingAppeal,
  onSubmit,
}: AppealFormProps) {
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate days remaining for appeal
  const rejectedDate = new Date(rejectedAt);
  const deadline = new Date(rejectedDate.getTime() + APPEAL_DEADLINE_DAYS * 86400000);
  const daysRemaining = Math.max(
    0,
    Math.ceil((deadline.getTime() - Date.now()) / 86400000),
  );
  const isExpired = daysRemaining === 0;

  // Already appealed and still pending
  const hasPendingAppeal = existingAppeal?.status === "pending";
  // Already appealed and decided
  const hasDecidedAppeal =
    existingAppeal?.status === "approved" || existingAppeal?.status === "denied";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Appeal reason is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(reason, evidence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit appeal");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasPendingAppeal) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Appeal Under Review</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your appeal was submitted on{" "}
          {new Date(existingAppeal!.submittedAt).toLocaleDateString()}. We&apos;ll
          notify you once a decision is made.
        </p>
      </Card>
    );
  }

  if (hasDecidedAppeal) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle
            className={`h-5 w-5 ${
              existingAppeal!.status === "approved"
                ? "text-green-500"
                : "text-red-500"
            }`}
          />
          <h3 className="font-semibold">
            Appeal {existingAppeal!.status === "approved" ? "Approved" : "Denied"}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your appeal was{" "}
          {existingAppeal!.status === "approved" ? "approved" : "denied"} on{" "}
          {existingAppeal!.decisionAt
            ? new Date(existingAppeal!.decisionAt).toLocaleDateString()
            : "the decision date"}
          .
        </p>
      </Card>
    );
  }

  if (isExpired) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h3 className="font-semibold">Appeal Period Expired</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The 30-day appeal window has closed. You can submit a new
          verification request instead.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <AlertCircle className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold">Appeal Rejected Verification</h3>
      </div>

      <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
        <p className="text-sm text-red-700 dark:text-red-300">
          <strong>Rejection reason:</strong> {rejectionReason}
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining to appeal
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Appeal Reason" required error={error ?? undefined}>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why the rejection should be reconsidered..."
            rows={4}
          />
        </FormField>

        <FormField label="Additional Evidence (optional)">
          <Textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Provide any new evidence to support your appeal..."
            rows={3}
          />
        </FormField>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          <Send className="h-4 w-4 mr-2" />
          {isSubmitting ? "Submitting..." : "Submit Appeal"}
        </Button>
      </form>
    </Card>
  );
}
