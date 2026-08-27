import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Verification – Dongle",
  description:
    "Submit your Stellar project for community verification or check the status of your verification request.",
  openGraph: {
    title: "Project Verification – Dongle",
    description:
      "Submit your Stellar project for community verification or check the status of your verification request.",
    url: "https://dongle.app/verify",
    images: [{ url: "https://dongle.app/og-verify.png" }],
  },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
