import { cn } from "@/app/lib/utils";

interface LoadingStateProps {
  label?: string;
  labelClassName?: string;
  className?: string;
}

export function LoadingState({
  label = "Loading...",
  labelClassName,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 gap-3",
        className,
      )}
    >
      <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
      {label && (
        <p className={cn("text-sm text-[#737373]", labelClassName)}>{label}</p>
      )}
    </div>
  );
}
