"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-2 rounded-lg transition-all cursor-pointer bg-white border border-[#E5E7EB] text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F5]"
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
        danger
          ? "text-[#DC2626] hover:bg-[rgba(220,38,38,0.07)]"
          : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#171717]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
