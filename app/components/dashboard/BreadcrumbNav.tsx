"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-[#737373]">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-[#002FA7] transition-colors cursor-pointer font-medium no-underline"
        title="My Files"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">My Files</span>
      </Link>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-[#A3A3A3]" />
          <Link
            href={`/dashboard?folderId=${encodeURIComponent(item.id)}`}
            className="hover:text-[#002FA7] transition-colors cursor-pointer truncate max-w-[160px] sm:max-w-[240px] no-underline"
            title={item.name}
          >
            {item.name}
          </Link>
        </div>
      ))}
    </nav>
  );
}
