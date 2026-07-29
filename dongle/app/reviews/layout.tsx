export const metadata = {
  title: "Community Reviews – Dongle",
  description: "Read and write transparent reviews of Stellar projects on Dongle.",
  openGraph: {
    title: "Community Reviews – Dongle",
    description: "Read and write transparent reviews of Stellar projects on Dongle.",
    url: "https://dongle.app/reviews",
    images: [{ url: "https://dongle.app/og-reviews.png" }]
  }
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
