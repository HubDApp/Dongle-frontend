"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import WalletGate from "@/components/wallet/WalletGate";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { useWallet } from "@/context/wallet.context";
import { FormTemplateLibrary } from "@/components/projects/FormTemplateLibrary";
import { Button } from "@/components/ui/Button";
import type { FormTemplate } from "@/types/form-template";

const TEMPLATES_PURPOSE =
  "Connect Freighter to manage saved form templates and browse the template library.";

export default function FormTemplatesPage() {
  const gate = useWalletPageGate();
  const { publicKey } = useWallet();
  const router = useRouter();

  const handleApply = (template: FormTemplate) => {
    try {
      sessionStorage.setItem(
        "dongle_pending_form_template",
        JSON.stringify(template.data),
      );
    } catch {
      // ignore storage failures
    }
    router.push("/projects/new?fromTemplate=1");
  };

  return (
    <main className="min-h-screen pt-32 pb-24 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-500 rounded-2xl text-white">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Form templates</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Browse the library, preview starters, and manage templates you have saved.
              </p>
            </div>
          </div>
          <Link href="/projects/new">
            <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to form
            </Button>
          </Link>
        </div>

        {gate.state === "ready" ? (
          <FormTemplateLibrary
            walletAddress={publicKey}
            onApplyTemplate={handleApply}
          />
        ) : (
          <div className="max-w-xl mx-auto">
            <WalletGate
              gate={gate}
              pagePurpose={TEMPLATES_PURPOSE}
              loadingMessage="Preparing your wallet..."
            />
            {/* Built-in library remains browsable without a wallet */}
            <div className="mt-10">
              <FormTemplateLibrary onApplyTemplate={handleApply} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
