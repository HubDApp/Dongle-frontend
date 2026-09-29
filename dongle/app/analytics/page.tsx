"use client";

import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import FormSubmissionAnalytics from "@/components/analytics/FormSubmissionAnalytics";
import { FormBackupRecovery } from "@/components/backup/FormBackupRecovery";
import { GDPRConsent } from "@/components/gdpr/GDPRConsent";
import { GDPRDataExport } from "@/components/gdpr/GDPRDataExport";
import { GDPRDataDeletion } from "@/components/gdpr/GDPRDataDeletion";

export default function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AnalyticsDashboard />
      <FormSubmissionAnalytics />
      <FormBackupRecovery
        formType="project"
        formId="default"
        currentData={{}}
        onRestore={() => {}}
      />

      <section className="mt-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">GDPR Compliance</h2>

        <GDPRConsent
          formType="analytics"
          formId="default"
          userId="anonymous"
          purposes={["analytics", "data_processing"]}
        />

        <div className="flex gap-3">
          <GDPRDataExport
            formType="project"
            formId="default"
            userId="anonymous"
          />
          <GDPRDataDeletion
            formType="project"
            formId="default"
            userId="anonymous"
          />
        </div>
      </section>
    </main>
  );
}
