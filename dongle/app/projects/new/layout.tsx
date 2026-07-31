import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit Project – Dongle",
  description:
    "Register your Stellar project on Dongle with an on-chain transaction. Secure, transparent, and decentralized.",
  openGraph: {
    title: "Submit Project – Dongle",
    description:
      "Register your Stellar project on Dongle with an on-chain transaction. Secure, transparent, and decentralized.",
    url: "https://dongle.app/projects/new",
    images: [{ url: "https://dongle.app/og-submit.png" }],
  },
};

export default function NewProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
