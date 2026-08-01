import { cn } from "@/app/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center py-24 text-center px-6",
        className,
      )}
    >
      <div className="w-14 h-14 bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-[#171717] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[#737373] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
