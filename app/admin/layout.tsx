import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description:
    "Vault admin control panel — manage users, quotas, storage allocation, and monitor system health.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
