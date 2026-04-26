"use client";

import React, { useState } from "react";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import VerificationForm from "@/components/verify/VerificationForm";
import VerificationStatus from "@/components/verify/VerificationStatus";
import { ShieldCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function VerifyPage() {
  const [activeTab, setActiveTab] = useState<"request" | "status">("request");
  const [trackedProjectId, setTrackedProjectId] = useState<string | undefined>();

  const handleVerificationRequested = (projectId: string) => {
    setTrackedProjectId(projectId);
    setActiveTab("status");
  };

  return (
    <LayoutWrapper>
      <main className="min-h-screen pt-32 pb-24 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-green-500/5 via-transparent to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12 animate-fade-in">
            <h1 className="text-4xl font-bold tracking-tight mb-4">Project Verification</h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400">
              Submit your project for community review or check the status of an existing request.
            </p>
          </div>

          <div className="max-w-md mx-auto flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl mb-12 animate-fade-in">
            <Button
              variant={activeTab === "request" ? "primary" : "ghost"}
              className={`flex-1 rounded-xl ${activeTab === "request" ? "shadow-sm" : ""}`}
              onClick={() => setActiveTab("request")}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Request
            </Button>
            <Button
              variant={activeTab === "status" ? "primary" : "ghost"}
              className={`flex-1 rounded-xl ${activeTab === "status" ? "shadow-sm" : ""}`}
              onClick={() => setActiveTab("status")}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Check Status
            </Button>
          </div>

          <div className="mt-8 transition-all duration-300">
            {activeTab === "request" ? (
              <VerificationForm onSuccess={handleVerificationRequested} />
            ) : (
              <VerificationStatus initialProjectId={trackedProjectId} />
            )}
          </div>
        </div>
      </main>
    </LayoutWrapper>
  );
}
