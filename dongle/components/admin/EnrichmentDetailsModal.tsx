"use client";

import React, { useState } from "react";
import type { FormEnrichmentResult } from "@/services/form-enrichment";
import {
  MapPin,
  Building,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Sparkles,
  Globe,
  Clock,
  Layers,
  X,
} from "lucide-react";

interface EnrichmentDetailsModalProps {
  enrichment: FormEnrichmentResult;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function EnrichmentDetailsModal({
  enrichment,
  projectName,
  isOpen,
  onClose,
}: EnrichmentDetailsModalProps) {
  if (!isOpen) return null;

  const { geocoding, company, email, phone, accuracy } = enrichment;

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "excellent":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "good":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "needs_review":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Enriched Data & Accuracy</h2>
              <p className="text-xs text-zinc-500">
                Metadata insights and verification checks for {projectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accuracy Banner */}
        <div className="p-6 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-transparent border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-lg text-purple-600 dark:text-purple-400 shadow-sm">
                {accuracy.overallScore}%
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Data Accuracy Score</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getTierBadge(
                      accuracy.qualityTier,
                    )}`}
                  >
                    {accuracy.qualityTier.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Calculated across email, phone, location geocoding, and domain consistency.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Geocoding Details */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/20">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <MapPin className="w-4 h-4 text-blue-500" />
              Address Geocoding
            </h3>
            {geocoding ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="text-[10px] text-zinc-400 block">Formatted Address</span>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {geocoding.formattedAddress}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="text-[10px] text-zinc-400 block">Coordinates</span>
                  <p className="font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {geocoding.latitude.toFixed(4)}, {geocoding.longitude.toFixed(4)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="text-[10px] text-zinc-400 block">Country</span>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {geocoding.country} ({geocoding.countryCode})
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="text-[10px] text-zinc-400 block">Timezone</span>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {geocoding.timezone}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No address provided for geocoding.</p>
            )}
          </div>

          {/* 2. Company Lookup */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/20">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Building className="w-4 h-4 text-purple-500" />
              Company Intelligence
            </h3>
            {company ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-[10px] text-zinc-400 block">Company Name</span>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {company.companyName}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-[10px] text-zinc-400 block">Industry & Sector</span>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {company.industry} • {company.sector}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-[10px] text-zinc-400 block">Team Size</span>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {company.employeeRange} employees
                    </p>
                  </div>
                </div>

                {company.techStack?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Identified Tech Stack</span>
                    <div className="flex flex-wrap gap-1.5">
                      {company.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-semibold"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No domain or company provided.</p>
            )}
          </div>

          {/* 3. Email & Phone Verifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/20">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <Mail className="w-4 h-4 text-emerald-500" />
                Email Verification
              </h3>
              {email ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status</span>
                    <span
                      className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                        email.status === "valid"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : email.status === "risky"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {email.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Deliverability Score</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {email.score} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Disposable Burner</span>
                    <span className="font-bold">{email.isDisposable ? "Yes (High Risk)" : "No"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Role-based Account</span>
                    <span className="font-bold">{email.isRoleBased ? "Yes" : "No"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No email provided.</p>
              )}
            </div>

            {/* Phone */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/20">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <Phone className="w-4 h-4 text-amber-500" />
                Phone Validation
              </h3>
              {phone ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Standard E.164</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {phone.e164 || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Country Code</span>
                    <span className="font-bold">{phone.countryCode || "Unknown"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Number Type</span>
                    <span className="font-bold capitalize">{phone.numberType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Valid Format</span>
                    <span className="font-bold">{phone.isValid ? "Valid" : "Invalid"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No phone provided.</p>
              )}
            </div>
          </div>

          {/* 4. Accuracy Checks Breakdown */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-3">
              Accuracy Checks & Quality Indicators
            </h4>
            <div className="space-y-2">
              {accuracy.checks.map((check) => (
                <div
                  key={check.name}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {check.passed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : check.severity === "error" ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <div>
                      <span className="font-bold">{check.name}</span>
                      <p className="text-zinc-500 text-[11px] mt-0.5">{check.message}</p>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    {check.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
