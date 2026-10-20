import ReviewModerationQueue from "@/components/moderation/ReviewModerationQueue";

export const metadata = {
  title: "Review Moderation | Dongle",
  description: "Admin moderation queue for flagged reviews",
};

export default function ReviewModerationPage() {
  return <ReviewModerationQueue />;
}
