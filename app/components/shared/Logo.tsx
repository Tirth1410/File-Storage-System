/**
 * Logo — the Vault brand mark used in header & auth screens.
 *
 * Mark concept: two geometric bars forming a "V" — a thick primary bar
 * and a thinner secondary bar creating depth. Pure geometry, no decoration.
 * The square container with minimal radius gives it a badge-like authority.
 */

interface LogoProps {
  /** Show the wordmark text next to the icon. Defaults to true. */
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: {
    px: 22,
    text: "text-sm",
    gap: "gap-2",
    letterSpacing: "tracking-[0.06em]",
  },
  md: {
    px: 28,
    text: "text-base",
    gap: "gap-2.5",
    letterSpacing: "tracking-[0.06em]",
  },
  lg: {
    px: 36,
    text: "text-lg",
    gap: "gap-3",
    letterSpacing: "tracking-[0.06em]",
  },
};

export function Logo({
  showText = true,
  size = "md",
  className = "",
}: LogoProps) {
  const s = sizeMap[size];
  return (
    <div
      className={`flex items-center ${s.gap} cursor-pointer select-none ${className}`}
    >
      {/* Icon Mark */}
      <div className="flex-shrink-0" style={{ width: s.px, height: s.px }}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {/* Square container — no gradient, just solid Klein Blue */}
          <rect width="100" height="100" rx="22" fill="#002FA7" />

          {/*
            The mark: a "V" built from two parallelogram bars.
            Primary bar: wide, left-leaning descent   (the heavy stroke)
            Secondary bar: narrower, right-leaning descent (the light stroke)
            Together they form a clean structural "V" at the optical center.
          */}

          {/* Left arm of V — bold bar */}
          <polygon points="18,22  38,22  55,76  35,76" fill="white" />

          {/* Right arm of V — slightly thinner, stepped down for depth */}
          <polygon
            points="46,22  62,22  82,76  66,76"
            fill="white"
            fillOpacity="0.45"
          />
        </svg>
      </div>

      {/* Wordmark */}
      {showText && (
        <span
          className={`${s.text} ${s.letterSpacing} font-semibold text-[#171717]`}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          VAULT
        </span>
      )}
    </div>
  );
}
