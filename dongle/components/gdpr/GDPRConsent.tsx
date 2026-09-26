"use client";

import React, { useState, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { gdprService, type GDPRConsent } from "@/services/gdpr/gdpr.service";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface GDPRConsentProps {
  formType: string;
  formId: string;
  userId: string;
  purposes?: string[];
  consentVersion?: string;
  onConsentChange?: (consent: GDPRConsent) => void;
}

export function GDPRConsent({
  formType,
  formId,
  userId,
  purposes = ["form_submission", "data_processing"],
  consentVersion,
  onConsentChange,
}: GDPRConsentProps) {
  const { t } = useTranslation();
  const version = consentVersion ?? "1.0.0";
  const [consent, setConsent] = useState<GDPRConsent>(() => {
    const existing = gdprService.getConsentStatus(formType, formId, userId);
    if (existing) {
      return {
        given: existing.consentGiven,
        timestamp: existing.consentTimestamp,
        version: existing.consentVersion,
        purposes: existing.purposes,
      };
    }
    return { given: false, timestamp: "", version, purposes };
  });

  const handleToggle = useCallback(() => {
    const newConsent: GDPRConsent = {
      given: !consent.given,
      timestamp: new Date().toISOString(),
      version,
      purposes,
    };
    setConsent(newConsent);

    gdprService.trackConsent(formType, formId, userId, purposes, newConsent.given);
    onConsentChange?.(newConsent);
  }, [consent, formType, formId, userId, purposes, version, onConsentChange]);

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
        <div className="flex-1 space-y-2">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {t("gdpr.consent.title")}
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {t("gdpr.consent.description")}
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-600 dark:text-zinc-400">
            {purposes.map((purpose) => (
              <li key={purpose}>{t(`gdpr.consent.purposes.${purpose}`)}</li>
            ))}
          </ul>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={consent.given}
          onCheckedChange={handleToggle}
          className="mt-1"
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          {t("gdpr.consent.label")}
          <Link
            href="/privacy-policy"
            className="ml-1 underline text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t("gdpr.consent.privacyPolicyLink")}
          </Link>
        </span>
      </label>

      {!consent.given && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4" />
          <span>{t("gdpr.consent.required")}</span>
        </div>
      )}
    </div>
  );
}
