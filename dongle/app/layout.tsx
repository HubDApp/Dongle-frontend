import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/wallet.context";
import { ConfirmDialogProvider } from "@/hooks/useConfirm";
import { ComparisonProvider } from "@/context/comparison.context";
import { Toaster } from "sonner";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import AnalyticsRoot from "@/components/analytics/AnalyticsRoot";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { AuthProvider } from "@/context/auth.context";
import { NotificationProvider } from "@/context/notification.context";
import { ThemeProvider } from "@/providers/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dongle - Your Onchain App Store",
  description:
    "The decentralized app store for Stellar. Discovery, reviews, and verification powered by on-chain transparency.",
  openGraph: {
    title: "Dongle - Your Onchain App Store",
    description:
      "The decentralized app store for Stellar. Discovery, reviews, and verification powered by on-chain transparency.",
    url: "https://dongle.app",
    type: "website",
    images: [
      {
        url: "https://dongle.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dongle - Onchain App Store",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dongle - Your Onchain App Store",
    description:
      "The decentralized app store for Stellar. Discovery, reviews, and verification powered by on-chain transparency.",
    images: ["https://dongle.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="system" storageKey="dongle-theme">
          <WalletProvider>
            <LocaleProvider>
              <AuthProvider>
                <NotificationProvider>
                  <ConfirmDialogProvider>
                    <ComparisonProvider>
                      <AnalyticsRoot>
                        <LayoutWrapper>{children}</LayoutWrapper>
                      </AnalyticsRoot>
                    </ComparisonProvider>
                  </ConfirmDialogProvider>
                </NotificationProvider>
              </AuthProvider>
            </LocaleProvider>
          </WalletProvider>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}