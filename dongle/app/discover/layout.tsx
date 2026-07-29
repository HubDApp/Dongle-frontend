import React from "react";

export const metadata = {
  title: "Discover Projects – Dongle",
  description: "Explore decentralized projects built on Stellar and Soroban.",
  openGraph: {
    title: "Discover Projects – Dongle",
    description: "Explore decentralized projects built on Stellar and Soroban.",
    url: "https://dongle.app/discover",
    type: "website",
    images: [{ url: "https://dongle.app/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover Projects – Dongle",
    description: "Explore decentralized projects built on Stellar and Soroban.",
    images: ["https://dongle.app/og-image.png"],
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
