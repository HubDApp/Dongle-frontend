import { toCsv } from "@/lib/analytics-dashboard/csv";
import type { Review } from "@/types/review";

export function reviewsToCsv(reviews: Review[]): string {
  const headers = [
    "review_id",
    "project_name",
    "reviewer_address",
    "rating",
    "review",
    "created_at",
    "owner_response",
    "owner_response_created_at",
    "owner_response_hidden_by_admin",
  ];
  const rows = reviews.map((review) => [
    review.id,
    review.projectName,
    review.userAddress,
    review.rating,
    review.comment,
    review.createdAt,
    review.ownerResponse?.text ?? "",
    review.ownerResponse?.createdAt ?? "",
    review.ownerResponse?.hiddenByAdmin ? "true" : "false",
  ]);
  return toCsv(headers, rows);
}
