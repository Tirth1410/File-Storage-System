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
}

export function SectionCard({
  title,
  titleRight,
  children,
  className = "",
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#171717] uppercase tracking-wide">
            {title}
          </h2>
          {titleRight && <div>{titleRight}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-6"}>{children}</div>
    </div>
  );
}
