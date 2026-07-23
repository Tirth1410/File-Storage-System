import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared File",
  description:
    "A file has been shared with you via Vault — the secure, privacy-first file storage platform.",
  // Share pages are intentionally indexable (public links)
  robots: { index: true, follow: false },
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
