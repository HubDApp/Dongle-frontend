"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { useWallet } from "@/context/wallet.context";
import { useStellarAccount } from "@/hooks/useStellarAccount";
import { reviewService } from "@/services/review/review.service";
import { projectService } from "@/services/project/project.service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  Wallet,
  LogOut,
  Star,
  MessageSquare,
  Zap,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { publicKey, isConnected, connectWallet, disconnectWallet } = useWallet();
  const { balances, loading: accountLoading, error: accountError } = useStellarAccount();
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Get user's reviews
  const userReviews = publicKey ? reviewService.getReviewsByUser(publicKey) : [];

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Disconnected state
  if (!isConnected) {
    return (
      <LayoutWrapper>
        <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Wallet className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Connect Your Wallet</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
                Connect your Stellar wallet to view your profile, manage reviews, and track your activity on Dongle.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={connectWallet}
                className="inline-flex items-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </Button>
            </div>
          </div>
        </main>
      </LayoutWrapper>
    );
  }

  // Loading state
  if (accountLoading) {
    return (
      <LayoutWrapper>
        <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center py-24">
              <Spinner size="lg" className="mb-4" />
              <p className="text-zinc-500 dark:text-zinc-400">
                Loading your profile...
              </p>
            </div>
          </div>
        </main>
      </LayoutWrapper>
    );
  }

  // Error state
  if (accountError) {
    return (
      <LayoutWrapper>
        <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Account Not Found</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                {accountError}
              </p>
              <Button
                variant="outline"
                onClick={() => disconnectWallet()}
              >
                Disconnect Wallet
              </Button>
            </div>
          </div>
        </main>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h1 className="text-4xl font-black mb-2 tracking-tight">
                YOUR PROFILE
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400">
                Manage your account and view your activity on Dongle.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={disconnectWallet}
              className="inline-flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Account Summary */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <h2 className="text-2xl font-bold mb-6">Account Summary</h2>

                {/* Wallet Address */}
                <div className="mb-8">
                  <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">
                    Wallet Address
                  </label>
                  <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                    <code className="flex-1 text-sm font-mono text-zinc-900 dark:text-zinc-100 break-all">
                      {publicKey}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      className="flex-shrink-0 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-zinc-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Balances */}
                {balances && balances.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 block">
                      Balances
                    </label>
                    <div className="space-y-3">
                      {balances.map((balance, idx) => {
                        const isNative = balance.asset_type === "native";
                        const assetCode = isNative
                          ? "Lumens (XLM)"
                          : (balance as any).asset_code || "Unknown";
                        const issuer = (balance as any).asset_issuer;

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl"
                          >
                            <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5 text-yellow-500" />
                              <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {assetCode}
                                </p>
                                {!isNative && issuer && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {issuer.substring(0, 8)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">
                              {parseFloat(balance.balance).toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* User Reviews */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    Your Reviews
                  </h2>
                  <Badge variant="secondary">{userReviews.length}</Badge>
                </div>

                {userReviews.length > 0 ? (
                  <div className="space-y-4">
                    {userReviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer"
                        onClick={() => router.push(`/projects/${review.projectId}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">
                              {review.projectName}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-500">
                              {review.rating}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {review.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No reviews yet. Start reviewing projects!</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/discover")}
                      className="mt-4"
                    >
                      Discover Projects
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stats */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Activity Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Reviews
                    </span>
                    <span className="font-bold text-lg">{userReviews.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Avg Rating
                    </span>
                    <span className="font-bold text-lg">
                      {userReviews.length > 0
                        ? (
                            userReviews.reduce((sum, r) => sum + r.rating, 0) /
                            userReviews.length
                          ).toFixed(1)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => router.push("/discover")}
                  >
                    Browse Projects
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/reviews")}
                  >
                    View All Reviews
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/submit")}
                  >
                    Submit Project
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </LayoutWrapper>
  );
}
