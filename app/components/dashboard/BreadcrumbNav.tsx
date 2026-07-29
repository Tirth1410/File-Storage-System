"use client";

import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

export function BreadcrumbNav({ items, onNavigate }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-[#737373]">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 hover:text-[#002FA7] transition-colors cursor-pointer font-medium"
        title="My Files"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">My Files</span>
      </button>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-[#A3A3A3]" />
          <button
            onClick={() => onNavigate(item.id)}
            className="hover:text-[#002FA7] transition-colors cursor-pointer truncate max-w-[160px] sm:max-w-[240px]"
            title={item.name}
          >
            {item.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
