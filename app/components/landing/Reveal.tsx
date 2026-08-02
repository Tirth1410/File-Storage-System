"use client";

import { useEffect, useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay in ms before the reveal transition starts. */
  delay?: number;
  className?: string;
}

/**
 * Reveal — fades and lifts children into view once they scroll into the
 * viewport. Content is visible by default (no-JS / reduced-motion safe);
 * the observer only adds the hidden "ready" state after mount.
 */
export function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const visible = () => {
      el.classList.add("reveal-show");
      el.classList.remove("reveal-ready");
    };

    // Add the hidden state on the next frame so SSR content never flashes
    // hidden for users whose browser doesn't support the observer.
    const raf = requestAnimationFrame(() => {
      el.classList.add("reveal-ready");
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              visible();
              io.disconnect();
            }
          });
        },
        { threshold: 0.05, rootMargin: "0px 0px 120px 0px" },
      );
      io.observe(el);
    });

    return () => {
      cancelAnimationFrame(raf);
      visible();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
