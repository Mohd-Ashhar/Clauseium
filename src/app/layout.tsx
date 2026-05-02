import type { Metadata, Viewport } from "next";
import { display, inter, mono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://clauseium.in"),
  title: {
    default: "Clauseium — AI contract review for Indian in-house counsel",
    template: "%s · Clauseium",
  },
  description:
    "Clauseium reviews, redlines, and drafts contracts under Indian law — grounded in the Indian Contract Act, DPDP, and your own playbook. Every clause cited. Every risk flagged.",
  keywords: [
    "Indian contract review",
    "DPDP compliance",
    "Indian Contract Act",
    "AI legal copilot",
    "in-house counsel India",
    "contract redline AI",
  ],
  openGraph: {
    title: "Clauseium — AI contract review for Indian in-house counsel",
    description:
      "Review contracts in 6 minutes, not 6 hours. Grounded in Indian law. Every clause cited.",
    type: "website",
    locale: "en_IN",
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
