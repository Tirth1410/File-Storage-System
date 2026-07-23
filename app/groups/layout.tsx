import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Groups",
  description:
    "Create and manage collaboration groups. Add members and share files with your team through granular access controls.",
  robots: { index: false, follow: false },
};

export default function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
