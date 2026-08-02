"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

interface CTALinkProps {
  href: string;
  children: React.ReactNode;
  /** Visual style. Defaults to "primary". */
  variant?: "primary" | "secondary" | "ghost" | "inverse" | "outline-light";
  size?: "sm" | "md" | "lg";
  /** Show a trailing arrow that nudges on hover. Defaults to false. */
  arrow?: boolean;
  className?: string;
  /** Close mobile menus etc. before navigating. */
  onNavigate?: () => void;
  ariaLabel?: string;
}

const baseStyles =
  "group inline-flex items-center justify-center gap-2 rounded-full font-semibold select-none " +
  "transition-all duration-200 ease-out will-change-transform " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002FA7] " +
  "focus-visible:ring-offset-2 " +
  "active:scale-[0.97] " +
  "disabled:pointer-events-none disabled:opacity-60 disabled:active:scale-100";

const sizeStyles: Record<NonNullable<CTALinkProps["size"]>, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-[clamp(1.75rem,2.2vw,2.25rem)] py-[clamp(0.875rem,1.4vh,1.125rem)] text-[clamp(0.9375rem,0.95vw,1rem)]",
};

const variantStyles: Record<NonNullable<CTALinkProps["variant"]>, string> = {
  primary:
    "bg-[#002FA7] text-white shadow-sm shadow-[#002FA7]/25 " +
    "hover:bg-[#002482] hover:shadow-[0_0_30px_-10px_rgba(0,47,167,0.6)] " +
    "focus-visible:ring-offset-[#FAFAFA]",
  secondary:
    "bg-white text-[#171717] border border-[#E5E7EB] shadow-sm " +
    "hover:border-[#D1D5DB] hover:bg-[#F5F5F5] hover:text-[#002FA7] " +
    "focus-visible:ring-offset-[#FAFAFA]",
  ghost:
    "text-[#525252] hover:text-[#002FA7] hover:bg-[rgba(0,47,167,0.06)] " +
    "focus-visible:ring-offset-[#FAFAFA]",
  inverse:
    "bg-white text-[#002FA7] shadow-xl shadow-black/10 " +
    "hover:bg-[#F5F5F5] hover:text-[#002482] " +
    "focus-visible:ring-offset-[#002FA7]",
  "outline-light":
    "bg-white/10 border border-white/25 text-white backdrop-blur " +
    "hover:bg-white/20 hover:text-white " +
    "focus-visible:ring-offset-[#002FA7]",
};

/**
 * CTALink — a navigation button with a pending loading state.
 *
 * Regular clicks are driven through `router.push` inside a transition so the
 * button immediately disables and shows a spinner while the route loads.
 * Middle-click / Ctrl+Click still open in a new tab via the native link
 * behaviour. In-page `#anchor` links smooth-scroll instead of navigating.
 */
export function CTALink({
  href,
  children,
  variant = "primary",
  size = "md",
  arrow = false,
  className = "",
  onNavigate,
  ariaLabel,
}: CTALinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isHash = href.startsWith("#");

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented) return;

    // Let the browser handle new-tab / new-window modifiers natively.
    if (
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    onNavigate?.();
    e.preventDefault();

    if (isPending) return;

    if (isHash) {
      const el = document.getElementById(href.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-disabled={isPending}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {isPending && (
        <Loader2
          className="w-4 h-4 animate-spin"
          aria-hidden="true"
          data-testid="cta-spinner"
        />
      )}
      <span>{children}</span>
      {arrow && (
        <ArrowRight
          className={`w-4 h-4 transition-transform duration-200 ${
            isPending ? "" : "group-hover:translate-x-0.5"
          }`}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
