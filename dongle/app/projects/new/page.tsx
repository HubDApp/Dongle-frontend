"use client";

import React from "react";
import ProjectForm from "@/components/projects/ProjectForm";
import WalletStatePanel, {
  WalletStateLoadingPanel,
} from "@/components/wallet/WalletStatePanel";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { ShieldCheck, Zap, Rocket } from "lucide-react";
import { Card } from "@/components/ui/Card";

const SUBMIT_PURPOSE =
  "Connect Freighter to register a new project on Dongle with an on-chain transaction.";

export default function NewProjectPage() {
  const gate = useWalletPageGate();

  return (
    <main className="min-h-screen pt-32 pb-24 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent">
      <div className="container mx-auto px-4">
        {gate.state === "ready" ? (
          <ProjectForm />
        ) : (
          <div className="max-w-xl mx-auto animate-fade-in">
            {gate.state === "account-loading" ? (
              <WalletStateLoadingPanel message="Preparing your wallet..." />
            ) : (
              <WalletStatePanel
                state={gate.state}
                pagePurpose={SUBMIT_PURPOSE}
                walletNetworkLabel={gate.walletNetworkLabel}
                publicKey={gate.publicKey}
                onConnect={gate.connectWallet}
                onDisconnect={gate.disconnectWallet}
              />
            )}

            {gate.state === "disconnected" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <Card className="text-left">
                  <ShieldCheck className="w-6 h-6 text-green-500 mb-3" />
                  <h3 className="font-bold mb-1">Secure</h3>
                  <p className="text-xs text-zinc-500">
                    Your keys never leave Freighter.
                  </p>
                </Card>
                <Card className="text-left">
                  <Zap className="w-6 h-6 text-yellow-500 mb-3" />
                  <h3 className="font-bold mb-1">Fast</h3>
                  <p className="text-xs text-zinc-500">
                    Transactions settle in seconds.
                  </p>
                </Card>
                <Card className="text-left">
                  <Rocket className="w-6 h-6 text-blue-500 mb-3" />
                  <h3 className="font-bold mb-1">Direct</h3>
                  <p className="text-xs text-zinc-500">
                    Register directly on-chain.
                  </p>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
