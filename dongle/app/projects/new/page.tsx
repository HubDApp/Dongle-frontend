"use client";

import React from "react";
import ProjectForm from "@/components/projects/ProjectForm";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { useWallet } from "@/context/wallet.context";
import { Wallet2, ShieldCheck, Zap } from "lucide-react";

export default function NewProjectPage() {
  const { isConnected, connectWallet, isConnecting } = useWallet();
  const [showForm, setShowForm] = React.useState(false);

  // If already connected, show form immediately
  // If not, allow mock bypass via showForm state
  const isFormVisible = isConnected || showForm;

  return (
    <LayoutWrapper>
      <main className="min-h-screen pt-32 pb-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent">
        <div className="container mx-auto px-4">
          {!isFormVisible ? (
            <div className="max-w-xl mx-auto text-center py-20 animate-fade-in">
              <div className="inline-flex p-4 bg-zinc-100 dark:bg-zinc-900 rounded-3xl mb-8 border border-zinc-200 dark:border-zinc-800">
                <Wallet2 className="w-8 h-8 text-blue-500" />
              </div>
              <h1 className="text-4xl font-bold mb-6 tracking-tight">Connect your wallet to get started</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mb-10 text-lg">
                To register a new project on Dongle, you need to sign an on-chain transaction with your Stellar wallet.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-10 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold hover:scale-105 transition-all active:scale-[0.98] shadow-xl shadow-zinc-500/10"
              >
                Connect Wallet
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
                <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left">
                  <ShieldCheck className="w-6 h-6 text-green-500 mb-3" />
                  <h3 className="font-bold mb-1">Secure</h3>
                  <p className="text-xs text-zinc-500">Your keys never leave Freighter.</p>
                </div>
                <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left">
                  <Zap className="w-6 h-6 text-yellow-500 mb-3" />
                  <h3 className="font-bold mb-1">Fast</h3>
                  <p className="text-xs text-zinc-500">Transactions settle in seconds.</p>
                </div>
                <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left">
                  <Rocket className="w-6 h-6 text-blue-500 mb-3" />
                  <h3 className="font-bold mb-1">Direct</h3>
                  <p className="text-xs text-zinc-500">Register directly on-chain.</p>
                </div>
              </div>
            </div>
          ) : (
            <ProjectForm />
          )}
        </div>
      </main>
    </LayoutWrapper>
  );
}

// Re-using Rocket icon since it's used in ProjectForm but missing import here
import { Rocket } from "lucide-react";
