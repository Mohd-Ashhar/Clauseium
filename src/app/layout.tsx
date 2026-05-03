import type { Metadata, Viewport } from "next";
import { display, inter, mono } from "@/lib/fonts";
import "./globals.css";

const SITE_URL = "https://clauseium.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Clauseium — AI contract review for Indian in-house counsel",
    template: "%s · Clauseium",
  },
  description:
    "Clauseium reviews, redlines, and drafts contracts under Indian law — grounded in the Indian Contract Act, DPDP, and your own playbook. Every clause cited. Every risk flagged.",
  applicationName: "Clauseium",
  authors: [{ name: "Clauseium", url: SITE_URL }],
  creator: "Clauseium",
  publisher: "Clauseium",
  category: "Legal Technology",
  keywords: [
    "Indian contract review",
    "DPDP compliance",
    "Indian Contract Act",
    "AI legal copilot",
    "in-house counsel India",
    "contract redline AI",
    "legal AI India",
    "contract drafting AI",
  ],
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Clauseium — AI contract review for Indian in-house counsel",
    description:
      "Review contracts in 6 minutes, not 6 hours. Grounded in Indian law. Every clause cited.",
    url: SITE_URL,
    siteName: "Clauseium",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clauseium — AI contract review for Indian in-house counsel",
    description:
      "Review contracts in 6 minutes, not 6 hours. Grounded in Indian law. Every clause cited.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
