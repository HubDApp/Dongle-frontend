"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { mockProjects } from "@/data/mockProjects";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import VerificationStatus from "@/components/verify/VerificationStatus";
import ReviewList from "@/components/reviews/ReviewList";
import { Review } from "@/types/review";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Globe,
  Star,
  MessageSquare,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<typeof mockProjects[0] | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUserAddress] = useState<string | null>(null);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      const foundProject = mockProjects.find((p) => p.id === projectId);
      setProject(foundProject || null);
      
      // Mock reviews data
      if (foundProject) {
        setReviews([
          {
            id: "rev-1",
            projectId: foundProject.id,
            projectName: foundProject.name,
            userAddress: "GABC...XYZ1",
            rating: 5,
            comment: "Excellent project! The team is very responsive and the product works flawlessly.",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: "rev-2",
            projectId: foundProject.id,
            projectName: foundProject.name,
            userAddress: "GDEF...XYZ2",
            rating: 4,
            comment: "Great concept and execution. Looking forward to future updates.",
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
        ]);
      }
      
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [projectId]);

  const handleEdit = (review: Review) => {
    console.log("Edit review:", review);
  };

  const handleDelete = (id: string) => {
    console.log("Delete review:", id);
  };

  if (isLoading) {
    return (
      <LayoutWrapper>
        <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center py-24">
              <Spinner size="lg" className="mb-4" />
              <p className="text-zinc-500 dark:text-zinc-400">Loading project details...</p>
            </div>
          </div>
        </main>
      </LayoutWrapper>
    );
  }

  if (!project) {
    return (
      <LayoutWrapper>
        <main className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <AlertCircle className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Project Not Found</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                The project you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <Button variant="primary" onClick={() => router.push("/discover")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Discover
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
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Project Header */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <Badge variant="primary" className="mb-3">
                      {project.category}
                    </Badge>
                    <h1 className="text-4xl font-bold mb-4">{project.name}</h1>
                    <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {project.rating}
                        </span>
                        <span>({project.reviews} reviews)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(project.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Image Placeholder */}
                <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6 overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-700 font-bold text-4xl">
                    {project.name[0]}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-3">About</h2>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm">
                    <Globe className="w-4 h-4 mr-2" />
                    Website
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <GitBranch className="w-4 h-4 mr-2" />
                    GitHub
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Reviews Section */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    Reviews
                  </h2>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push("/reviews")}
                  >
                    Write a Review
                  </Button>
                </div>
                <ReviewList
                  reviews={reviews}
                  currentUserAddress={currentUserAddress}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Verification Status */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Verification Status</h3>
                <VerificationStatus initialProjectId={project.id} />
              </div>

              {/* Quick Stats */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Rating</span>
                    <span className="font-bold">{project.rating} / 5.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Total Reviews</span>
                    <span className="font-bold">{project.reviews}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Category</span>
                    <span className="font-bold">{project.category}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => router.push("/reviews")}
                  >
                    Leave a Review
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/verify")}
                  >
                    Request Verification
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
