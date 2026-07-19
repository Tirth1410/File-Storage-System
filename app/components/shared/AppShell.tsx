/**
 * AppShell — Premium floating glassmorphic navbar.
 * Features: scroll-aware shrink, smooth hover lift, sliding active indicator,
 * pill CTA with glow, logo hover animation, dark glassmorphism.
 */
"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/lib/auth-client";
import { useEffect, useRef, useState } from "react";

interface NavAction {
  label: string;
  onClick: () => void;
  variant?: "ghost" | "primary" | "danger";
}

interface AppShellProps {
  /** Name of the logged-in user */
  userName?: string;
  /** Optional: show a back nav link returning to a route */
  backHref?: string;
  backLabel?: string;
  /** Optional: extra action buttons to show on the right */
  actions?: NavAction[];
  /** Show sign-out button. Defaults to true. */
  showSignOut?: boolean;
}

export function AppShell({
  userName,
  backHref,
  backLabel = "Back",
  actions = [],
  showSignOut = true,
}: AppShellProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const actionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* ── Scroll listener ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Sliding indicator calculation ── */
  const updateIndicator = (label: string | null) => {
    if (!label || !navRef.current || !actionRefs.current[label]) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const containerRect = navRef.current.getBoundingClientRect();
    const btnRect = actionRefs.current[label]!.getBoundingClientRect();
    setIndicatorStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
      opacity: 1,
    });
  };

  const handleHover = (label: string | null) => {
    updateIndicator(label);
  };

  /* ── Nav items: back link + actions ── */
  const navItems: Array<{ label: string; onClick: () => void }> = [];
  if (backHref) {
    navItems.push({ label: backLabel, onClick: () => router.push(backHref) });
  } else if (userName) {
    navItems.push({
      label: "Dashboard",
      onClick: () => router.push("/dashboard"),
    });
    navItems.push({ label: "Groups", onClick: () => router.push("/groups") });
    navItems.push({ label: "Profile", onClick: () => router.push("/profile") });
  }

  const primaryActions = actions.filter((a) => a.variant === "primary");
  const ghostActions = actions.filter((a) => a.variant !== "primary");

  return (
    <>
      {/* ── Styles injected once ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .vault-navbar {
          font-family: 'Inter', -apple-system, sans-serif;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          display: flex;
          justify-content: center;
          padding: 14px 16px;
          pointer-events: none;
          transition: padding 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .vault-navbar.scrolled {
          padding: 8px 16px;
        }

        .vault-navbar-inner {
          pointer-events: all;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          max-width: 900px;
          height: 56px;
          padding: 0 20px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(18px) saturate(1.8);
          -webkit-backdrop-filter: blur(18px) saturate(1.8);
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.06),
            0 1px 0 rgba(255, 255, 255, 0.5) inset;
          transition:
            height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            background 0.4s ease,
            box-shadow 0.4s ease,
            backdrop-filter 0.4s ease;
        }

        .vault-navbar.scrolled .vault-navbar-inner {
          height: 48px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.08),
            0 1px 0 rgba(255, 255, 255, 0.8) inset;
          backdrop-filter: blur(28px) saturate(2);
          -webkit-backdrop-filter: blur(28px) saturate(2);
        }

        /* ── Logo ── */
        .vault-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          cursor: pointer;
          text-decoration: none;
          flex-shrink: 0;
          transition: opacity 0.2s ease;
        }
        .vault-logo:hover { opacity: 0.85; }

        .vault-logo-mark {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, #3b6fe8 0%, #002FA7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0, 47, 167, 0.3);
          flex-shrink: 0;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease;
        }
        .vault-logo:hover .vault-logo-mark {
          transform: rotate(-8deg) scale(1.08);
          box-shadow: 0 4px 18px rgba(59, 111, 232, 0.4);
        }

        .vault-logo-dot {
          width: 8px;
          height: 8px;
          background: #fff;
          border-radius: 50%;
        }

        .vault-logo-text {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.4px;
          color: #171717;
          line-height: 1;
        }

        /* ── Center nav ── */
        .vault-nav-center {
          position: relative;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .vault-nav-indicator {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 32px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.03);
          transition:
            left 0.28s cubic-bezier(0.4, 0, 0.2, 1),
            width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.18s ease;
          pointer-events: none;
        }

        .vault-nav-btn {
          position: relative;
          padding: 6px 13px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: #737373;
          background: transparent;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition:
            color 0.25s ease,
            transform 0.25s ease;
          letter-spacing: -0.1px;
          line-height: 1;
        }
        .vault-nav-btn:hover {
          color: #171717;
          transform: translateY(-1px);
        }

        /* ── Right actions ── */
        .vault-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .vault-user-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px 4px 4px;
          border-radius: 40px;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .vault-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b6fe8, #002FA7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }

        .vault-user-name {
          font-size: 12.5px;
          font-weight: 600;
          color: #171717;
          line-height: 1;
          letter-spacing: -0.1px;
        }

        .vault-btn-ghost {
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: #525252;
          background: transparent;
          border: 1px solid rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition:
            color 0.25s ease,
            background 0.25s ease,
            border-color 0.25s ease,
            transform 0.25s ease,
            box-shadow 0.25s ease;
          letter-spacing: -0.1px;
        }
        .vault-btn-ghost:hover {
          color: #171717;
          background: rgba(0, 0, 0, 0.03);
          border-color: rgba(0, 0, 0, 0.12);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .vault-btn-primary {
          padding: 7px 18px;
          border-radius: 40px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #3b6fe8 0%, #002FA7 100%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          letter-spacing: -0.1px;
          box-shadow:
            0 2px 10px rgba(0, 47, 167, 0.3),
            0 1px 0 rgba(255, 255, 255, 0.15) inset;
          transition:
            transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.25s ease,
            filter 0.25s ease;
        }
        .vault-btn-primary:hover {
          transform: translateY(-1.5px) scale(1.03);
          box-shadow:
            0 6px 20px rgba(59, 111, 232, 0.4),
            0 1px 0 rgba(255, 255, 255, 0.2) inset;
          filter: brightness(1.08);
        }

        .vault-btn-danger {
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: #DC2626;
          background: rgba(220, 38, 38, 0.06);
          border: 1px solid rgba(220, 38, 38, 0.15);
          cursor: pointer;
          transition:
            color 0.25s ease,
            background 0.25s ease,
            transform 0.25s ease;
          letter-spacing: -0.1px;
        }
        .vault-btn-danger:hover {
          color: #B91C1C;
          background: rgba(220, 38, 38, 0.1);
          transform: translateY(-1px);
        }

        /* ── Separator ── */
        .vault-sep {
          width: 1px;
          height: 18px;
          background: rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .vault-navbar { padding: 10px 10px; }
          .vault-navbar-inner { padding: 0 14px; max-width: 100%; }
          .vault-logo-text { display: none; }
          .vault-user-name { display: none; }
          .vault-user-badge { padding: 4px; }
        }
      `}</style>

      <header className={`vault-navbar${scrolled ? " scrolled" : ""}`}>
        <div className="vault-navbar-inner">
          {/* ── Left: Logo ── */}
          <button
            className="vault-logo"
            onClick={() => router.push("/dashboard")}
            aria-label="Go to Dashboard"
          >
            <div className="vault-logo-mark">
              <div className="vault-logo-dot" />
            </div>
            <span className="vault-logo-text">Vault</span>
          </button>

          {/* ── Center: Nav Items ── */}
          {navItems.length > 0 && (
            <nav
              ref={navRef}
              className="vault-nav-center"
              onMouseLeave={() => handleHover(null)}
            >
              {/* Sliding indicator */}
              <div
                className="vault-nav-indicator"
                style={{
                  left: indicatorStyle.left,
                  width: indicatorStyle.width,
                  opacity: indicatorStyle.opacity,
                }}
              />
              {navItems.map((item) => (
                <button
                  key={item.label}
                  ref={(el) => {
                    actionRefs.current[item.label] = el;
                  }}
                  className="vault-nav-btn"
                  onClick={item.onClick}
                  onMouseEnter={() => handleHover(item.label)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {/* ── Right: User + Actions ── */}
          <div className="vault-actions">
            {/* User badge */}
            {userName && (
              <div className="vault-user-badge">
                <div className="vault-avatar">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="vault-user-name">{userName}</span>
              </div>
            )}

            {/* Ghost actions */}
            {ghostActions.map((action) => (
              <button
                key={action.label}
                className="vault-btn-ghost"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}

            {/* Separator before CTA if needed */}
            {primaryActions.length > 0 &&
              (ghostActions.length > 0 || userName) && (
                <div className="vault-sep" />
              )}

            {/* Primary CTA actions */}
            {primaryActions.map((action) => (
              <button
                key={action.label}
                className="vault-btn-primary"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}

            {/* Sign Out */}
            {showSignOut && (
              <>
                {(actions.length > 0 || userName) && (
                  <div className="vault-sep" />
                )}
                <button
                  className="vault-btn-ghost"
                  onClick={() =>
                    signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          router.push("/sign-in");
                        },
                      },
                    })
                  }
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Spacer so page content clears the fixed navbar */}
      <div style={{ height: "84px" }} />
    </>
  );
}
