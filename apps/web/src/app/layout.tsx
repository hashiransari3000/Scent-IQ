import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { PwaRegister } from "@/components/pwa-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: "variable",
  axes: ["SOFT", "WONK", "opsz"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ScentIQ — Find the fragrance that feels like you",
    template: "%s · ScentIQ",
  },
  description:
    "ScentIQ turns notes, scent families and your own taste into personalised fragrance recommendations you can actually understand. Explore 1,478 perfumes across 160 houses.",
  applicationName: "ScentIQ",
  keywords: [
    "fragrance recommendation",
    "perfume finder",
    "scent profile",
    "perfume catalogue",
    "machine learning",
    "K-Means",
    "decision tree",
  ],
  authors: [{ name: "Hashir Ansari" }],
  creator: "Hashir Ansari",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ScentIQ",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "ScentIQ",
    title: "ScentIQ — Find the fragrance that feels like you",
    description:
      "A scent-intelligence project: content-based similarity, K-Means clusters and a decision tree, with explanations for every recommendation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScentIQ — Find the fragrance that feels like you",
    description:
      "Personalised fragrance recommendations with a reason behind every match.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0E0D0B",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-ivory"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
        <SiteFooter />
        <BottomNav />
        <PwaRegister />
      </body>
    </html>
  );
}
