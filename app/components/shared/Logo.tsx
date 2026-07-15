/**
 * Logo — the Vault brand mark used in header & auth screens.
 */

interface LogoProps {
  /** Show the wordmark text next to the icon. Defaults to true. */
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { icon: "w-5 h-5", dot: "w-1.5 h-1.5", text: "text-base" },
  md: { icon: "w-7 h-7", dot: "w-2.5 h-2.5", text: "text-xl" },
  lg: { icon: "w-9 h-9", dot: "w-3 h-3", text: "text-2xl" },
};

export function Logo({
  showText = true,
  size = "md",
  className = "",
}: LogoProps) {
  const s = sizeMap[size];
  return (
    <div
      className={`flex items-center gap-2.5 group cursor-pointer ${className}`}
    >
      <div
        className={`${s.icon} bg-gradient-to-br from-[#3b6fe8] to-[#002FA7] rounded-md flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-105 group-hover:shadow-[0_4px_18px_rgba(59,111,232,0.5)]`}
        style={{ boxShadow: "0 2px 10px rgba(0,47,167,0.4)" }}
      >
        <div className={`${s.dot} bg-white rounded-full`} />
      </div>
      {showText && (
        <span
          className={`font-semibold ${s.text} tracking-tight text-[#171717] transition-opacity duration-200 group-hover:opacity-80`}
        >
          Vault
        </span>
      )}
    </div>
  );
}
