import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Your Vault profile — storage usage, quota details, and activity audit logs.",
  robots: { index: false, follow: false },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
