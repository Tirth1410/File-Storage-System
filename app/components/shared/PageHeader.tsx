import { cn } from "@/app/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  dataTour?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  titleClassName,
  dataTour,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <h1
          className={cn(
            "text-2xl font-bold tracking-tight text-[#171717]",
            titleClassName,
          )}
          data-tour={dataTour}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#737373] mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
