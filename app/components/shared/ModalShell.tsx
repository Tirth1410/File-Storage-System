"use client";

import { cn } from "@/app/lib/utils";

const widthClasses: Record<NonNullable<ModalShellProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
};

interface ModalShellProps {
  onClose: () => void;
  /** Rendered on the right side of the header, before the close button */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: "sm" | "md" | "lg" | "2xl" | "4xl";
  /** Extra classes for the inner card (layout, max-height, etc.) */
  className?: string;
  /** Extra classes for the outer backdrop */
  containerClassName?: string;
  /** Hide the header bar entirely (content provides its own heading) */
  headerless?: boolean;
}

export function ModalShell({
  onClose,
  headerActions,
  children,
  title,
  subtitle,
  maxWidth = "md",
  className,
  containerClassName,
  headerless = false,
}: ModalShellProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4",
        containerClassName,
      )}
    >
      <div
        className={cn(
          "bg-white border border-[#E5E7EB] rounded-2xl w-full shadow-2xl overflow-hidden",
          widthClasses[maxWidth],
          className,
        )}
      >
        {!headerless && (
          <div className="flex justify-between items-center gap-3 px-4 py-4 border-b border-[#E5E7EB] sm:px-6">
            <div className="min-w-0 overflow-hidden">
              {title && (
                <h3 className="text-sm font-bold text-[#171717] truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[#737373] font-mono mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
