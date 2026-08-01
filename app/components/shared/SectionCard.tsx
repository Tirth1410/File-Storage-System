/**
 * SectionCard — a titled white card container used throughout internal pages.
 */

interface SectionCardProps {
  title?: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Remove default padding */
  noPadding?: boolean;
  /** Extra classes applied to the inner content wrapper */
  contentClassName?: string;
}

export function SectionCard({
  title,
  titleRight,
  children,
  className = "",
  noPadding = false,
  contentClassName = "",
}: SectionCardProps) {
  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden ${className}`}
    >
      {(title || titleRight) && (
        <div className="flex flex-col gap-3 px-4 py-4 border-b border-[#E5E7EB] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {title && (
            <h2 className="text-sm font-bold text-[#171717] uppercase tracking-wide">
              {title}
            </h2>
          )}
          {titleRight && <div className="min-w-0">{titleRight}</div>}
        </div>
      )}
      <div className={`${noPadding ? "" : "p-4 sm:p-6"} ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
