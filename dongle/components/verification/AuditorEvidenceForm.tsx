"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Upload, FileCheck, Shield, Star } from "lucide-react";

/**
 * AuditorEvidenceForm — allows approved auditors to submit verification
 * evidence directly without project owner intermediary (#690).
 */

interface AuditorEvidenceFormProps {
  verificationId: string;
  auditorAddress: string;
  onSubmitted?: () => void;
}

interface EvidenceData {
  auditorSignature: string;
  reportCid: string;
  findings: string;
  severity: "low" | "medium" | "high" | "critical";
}

export function AuditorEvidenceForm({
  verificationId,
  auditorAddress,
  onSubmitted,
}: AuditorEvidenceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceData>({
    auditorSignature: "",
    reportCid: "",
    findings: "",
    severity: "low",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidence.reportCid || !evidence.findings) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit evidence to the verification service
      const response = await fetch(
        `/api/verifications/${verificationId}/evidence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...evidence,
            auditorAddress,
            submittedAt: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to submit evidence");

      toast.success("Evidence submitted successfully");
      onSubmitted?.();
      setEvidence({ auditorSignature: "", reportCid: "", findings: "", severity: "low" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit evidence");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-blue-500" />
        <h3 className="font-semibold">Submit Auditor Evidence</h3>
        <Badge variant="info">Auditor</Badge>
      </div>

      <div>
        <label htmlFor="reportCid" className="block text-sm font-medium mb-1">
          Report CID (IPFS) *
        </label>
        <input
          id="reportCid"
          type="text"
          value={evidence.reportCid}
          onChange={(e) => setEvidence({ ...evidence, reportCid: e.target.value })}
          placeholder="Qm..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
      </div>

      <div>
        <label htmlFor="findings" className="block text-sm font-medium mb-1">
          Findings *
        </label>
        <textarea
          id="findings"
          value={evidence.findings}
          onChange={(e) => setEvidence({ ...evidence, findings: e.target.value })}
          placeholder="Describe your audit findings..."
          rows={4}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
      </div>

      <div>
        <label htmlFor="severity" className="block text-sm font-medium mb-1">
          Severity
        </label>
        <select
          id="severity"
          value={evidence.severity}
          onChange={(e) => setEvidence({ ...evidence, severity: e.target.value as EvidenceData["severity"] })}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div>
        <label htmlFor="signature" className="block text-sm font-medium mb-1">
          Auditor Signature
        </label>
        <input
          id="signature"
          type="text"
          value={evidence.auditorSignature}
          onChange={(e) => setEvidence({ ...evidence, auditorSignature: e.target.value })}
          placeholder="Optional: cryptographic signature"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {isSubmitting ? "Submitting..." : "Submit Evidence"}
      </Button>
    </form>
  );
}

/**
 * AuditorReputationScore — displays an auditor's reputation based on
 * evidence acceptance rate (#690).
 */
export function AuditorReputationScore({
  accepted,
  total,
}: {
  accepted: number;
  total: number;
}) {
  const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const stars = Math.round((rate / 100) * 5);

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < stars ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"}`}
          />
        ))}
      </div>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {rate}% acceptance ({accepted}/{total})
      </span>
    </div>
  );
}
