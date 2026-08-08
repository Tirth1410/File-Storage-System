interface SpinnerProps {
  size?: "sm" | "md";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${sizeClass} border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}
