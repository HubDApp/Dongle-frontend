export const metadata = {
  title: "Community Reviews – Dongle",
  description: "Read and write transparent reviews of Stellar projects on Dongle.",
  openGraph: {
    title: "Community Reviews – Dongle",
    description: "Read and write transparent reviews of Stellar projects on Dongle.",
    url: "https://dongle.app/reviews",
    type: "website",
    images: [{ url: "https://dongle.app/og-reviews.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Community Reviews – Dongle",
    description: "Read and write transparent reviews of Stellar projects on Dongle.",
    images: ["https://dongle.app/og-reviews.png"],
  },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
