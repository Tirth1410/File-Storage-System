import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { APP_URL } from "@/app/lib/config";
import "react-loading-skeleton/dist/skeleton.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  // ── Title ──────────────────────────────────────────────────────────────────
  title: {
    default: "Vault — Secure File Storage",
    template: "%s · Vault",
  },

  // ── Core ───────────────────────────────────────────────────────────────────
  description:
    "Vault is a high-performance, privacy-first file storage platform. Upload files up to 200 MB directly to the cloud, share with fine-grained permissions, and manage your storage with full auditability.",
  keywords: [
    "file storage",
    "secure file upload",
    "cloud storage",
    "file sharing",
    "multipart upload",
    "Cloudflare R2",
    "privacy-first storage",
    "Vault",
  ],
  authors: [{ name: "Vault" }],
  creator: "Vault",
  applicationName: "Vault",

  // ── Icons ──────────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },

  // ── Canonical / Robots ────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Open Graph ────────────────────────────────────────────────────────────
  openGraph: {
    type: "website",
    siteName: "Vault",
    title: "Vault — Secure File Storage",
    description:
      "Upload, share, and manage files up to 200 MB with direct-to-cloud uploads, short-lived presigned links, and fine-grained access control.",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vault — Secure File Storage",
      },
    ],
  },

  // ── Twitter / X Card ─────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Vault — Secure File Storage",
    description:
      "Upload, share, and manage files up to 200 MB with direct-to-cloud uploads and fine-grained access control.",
    images: ["/og-image.png"],
  },

  // ── Theme ─────────────────────────────────────────────────────────────────
  other: {
    "theme-color": "#002FA7",
    "color-scheme": "light",
    "msapplication-TileColor": "#002FA7",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
