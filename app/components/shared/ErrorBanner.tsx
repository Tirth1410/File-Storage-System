import { cn } from "@/app/lib/utils";

interface ErrorBannerProps {
  message: string;
  /** inline = small text for forms; banner = larger block notice */
  variant?: "inline" | "banner";
  className?: string;
}

export function ErrorBanner({
  message,
  variant = "inline",
  className,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        variant === "inline"
          ? "text-xs text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] p-3 rounded-lg"
          : "text-sm text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] px-4 py-3 rounded-xl",
        className,
      )}
    >
      {message}
    </div>
  );
}
