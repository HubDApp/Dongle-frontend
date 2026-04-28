"use client";

import { useState } from "react";
import { useWallet } from "@/context/wallet.context";
import { reviewService } from "@/services/review/review.service";
import { Review, Project } from "@/types/review";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewForm from "@/components/reviews/ReviewForm";

const MOCK_PROJECTS: Project[] = [
  { id: "1", name: "Soroban Swap", category: "DeFi / DEX", description: "Next-generation automated market maker on Soroban.", rating: 4.8, reviews: 124 },
  { id: "2", name: "Stellar Guardians", category: "Gaming / NFT", description: "A decentralized strategy game with on-chain assets.", rating: 4.5, reviews: 89 },
  { id: "3", name: "Anchor Connect", category: "Infrastructure", description: "Seamless on/off ramp protocol for Stellar anchors.", rating: 4.9, reviews: 210 },
];

export default function ReviewsPage() {
  const { isConnected, publicKey, connectWallet } = useWallet();
  // Lazy initializer — reads from service once on mount, no effect needed
  const [reviews, setReviews] = useState<Review[]>(() => reviewService.getReviews());
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleAddReview = (project: Project) => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    setSelectedProject(project);
    setIsAddingReview(true);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    const project = MOCK_PROJECTS.find(p => p.id === review.projectId) || {
        id: review.projectId,
        name: review.projectName,
        category: "",
        description: "",
        rating: 0,
        reviews: 0
    };
    setSelectedProject(project);
  };

  const handleDeleteReview = (id: string) => {
    if (confirm("Are you sure you want to delete this review?")) {
      reviewService.deleteReview(id);
      setReviews(reviewService.getReviews());
    }
  };

  const handleSubmit = (data: { rating: number; comment: string }) => {
    if (!publicKey || !selectedProject) return;

    if (editingReview) {
      reviewService.updateReview(editingReview.id, data);
    } else {
      reviewService.addReview({
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        userAddress: publicKey,
        ...data,
      });
    }

    setReviews(reviewService.getReviews());
    setIsAddingReview(false);
    setEditingReview(null);
    setSelectedProject(null);
  };

  return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h1 className="text-4xl font-black mb-2 tracking-tight">COMMUNITY REVIEWS</h1>
              <p className="text-zinc-500 dark:text-zinc-400">
                Transparent feedback from the Stellar ecosystem.
              </p>
            </div>
            {!isAddingReview && !editingReview && (
              <div className="flex gap-2">
                {MOCK_PROJECTS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAddReview(p)}
                    className="text-xs font-bold px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
                  >
                    Review {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(isAddingReview || editingReview) && selectedProject && (
            <div className="mb-12">
              <ReviewForm
                projectId={selectedProject.id}
                projectName={selectedProject.name}
                userAddress={publicKey || ""}
                initialReview={editingReview || undefined}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setIsAddingReview(false);
                  setEditingReview(null);
                  setSelectedProject(null);
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-12">
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-500 rounded-full" />
                Recent Activity
              </h2>
              <ReviewList
                reviews={reviews}
                currentUserAddress={publicKey}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
              />
            </section>
          </div>
        </div>
      </div>
  );
}
