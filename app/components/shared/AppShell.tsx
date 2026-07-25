/**
 * AppShell — Premium floating glassmorphic navbar.
 * Features: scroll-aware shrink, smooth hover lift, sliding active indicator,
 * pill CTA with glow, logo hover animation, dark glassmorphism.
 */
"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/lib/auth-client";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/app/components/shared/Logo";
import { Menu, X } from "lucide-react";

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
  const [menuOpen, setMenuOpen] = useState(false);
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
  }

  const primaryActions = actions.filter((a) => a.variant === "primary");
  const ghostActions = actions.filter((a) => a.variant !== "primary");

  const navigateAndClose = (onClick: () => void) => {
    setMenuOpen(false);
    onClick();
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

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
          box-sizing: border-box;
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
          max-width: min(900px, calc(100vw - 20px));
          height: 56px;
          padding: 0 20px;
          box-sizing: border-box;
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
          min-width: 0;
          transition: opacity 0.2s ease;
        }
        .vault-logo:hover { opacity: 1; }


        /* ── Center nav ── */
        .vault-nav-center {
          position: relative;
          display: flex;
          align-items: center;
          gap: 2px;
          min-width: 0;
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
          min-width: 0;
          flex-shrink: 0;
        }

        .vault-mobile-controls,
        .vault-mobile-menu,
        .vault-mobile-dismiss {
          display: none;
        }

        .vault-user-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px 4px 4px;
          border-radius: 40px;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .vault-user-badge:hover {
          background: rgba(0, 0, 0, 0.06);
          transform: translateY(-1px);
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
        .vault-navbar-spacer {
          height: 84px;
        }

        @media (max-width: 760px) {
          .vault-navbar { padding: 8px 8px; }
          .vault-navbar.scrolled { padding: 6px 8px; }

          .vault-navbar-inner {
            height: 56px;
            min-height: 52px;
            gap: 10px;
            padding: 8px 10px;
            border-radius: 24px;
            overflow: hidden;
          }

          .vault-navbar.scrolled .vault-navbar-inner {
            height: 52px;
            min-height: 48px;
          }

          .vault-logo-text {
            max-width: 86px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .vault-nav-center,
          .vault-actions {
            display: none;
          }

          .vault-mobile-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
          }

          .vault-mobile-icon-btn {
            width: 36px;
            height: 36px;
            border-radius: 14px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            background: rgba(255, 255, 255, 0.72);
            color: #171717;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s ease, transform 0.2s ease;
          }

          .vault-mobile-icon-btn:hover {
            background: rgba(0, 0, 0, 0.04);
            transform: translateY(-1px);
          }

          .vault-mobile-dismiss {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 48;
            background: transparent;
            border: 0;
            padding: 0;
            cursor: default;
          }

          .vault-mobile-menu {
            pointer-events: all;
            display: block;
            position: fixed;
            top: 70px;
            right: 8px;
            z-index: 52;
            width: min(168px, calc(100vw - 16px));
            padding: 8px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.94);
            border: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow:
              0 14px 40px rgba(0, 0, 0, 0.12),
              0 1px 0 rgba(255, 255, 255, 0.8) inset;
            backdrop-filter: blur(22px) saturate(1.6);
            -webkit-backdrop-filter: blur(22px) saturate(1.6);
          }

          .vault-navbar.scrolled ~ .vault-mobile-menu {
            top: 62px;
          }

          .vault-mobile-menu-list {
            display: grid;
            gap: 4px;
          }

          .vault-mobile-menu-item {
            width: 100%;
            min-height: 42px;
            padding: 10px 12px;
            border-radius: 12px;
            border: 0;
            background: transparent;
            color: #171717;
            font-size: 14px;
            font-weight: 650;
            text-align: left;
            cursor: pointer;
            transition: background 0.2s ease, color 0.2s ease;
          }

          .vault-mobile-menu-item:hover {
            background: rgba(0, 0, 0, 0.04);
          }

          .vault-mobile-menu-item.primary {
            color: #002FA7;
            background: rgba(0, 47, 167, 0.07);
          }

          .vault-mobile-menu-item.danger {
            color: #DC2626;
            background: rgba(220, 38, 38, 0.07);
          }

          .vault-navbar-spacer {
            height: 80px;
          }
        }

        @media (max-width: 380px) {
          .vault-logo-text { display: none; }
        }
      `}</style>

      <header className={`vault-navbar${scrolled ? " scrolled" : ""}`}>
        <div className="vault-navbar-inner" data-tour="navbar">
          {/* ── Left: Logo ── */}
          <button
            className="vault-logo bg-transparent border-0 p-0 text-left cursor-pointer"
            onClick={() => {
              setMenuOpen(false);
              router.push("/dashboard");
            }}
            aria-label="Go to Dashboard"
          >
            <Logo size="md" />
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

          {/* ── Right: User + Actions (desktop) ── */}
          <div className="vault-actions">
            {/* User badge */}
            {userName && (
              <button
                className="vault-user-badge bg-transparent border-0 p-0 cursor-pointer"
                onClick={() => router.push("/profile")}
                aria-label="Go to Profile"
                data-tour="user-badge"
              >
                <div className="vault-avatar">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="vault-user-name">{userName}</span>
              </button>
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
                <button className="vault-btn-ghost" onClick={handleSignOut}>
                  Sign Out
                </button>
              </>
            )}
          </div>

          {/* ── Right: User + Menu (mobile) ── */}
          <div className="vault-mobile-controls">
            {userName && (
              <button
                className="vault-user-badge bg-transparent border-0 p-0 cursor-pointer"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
                aria-label="Go to Profile"
              >
                <div className="vault-avatar">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </button>
            )}
            <button
              className="vault-mobile-icon-btn"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={
                menuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            className="vault-mobile-dismiss"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation menu"
            tabIndex={-1}
          />
          <div className="vault-mobile-menu" role="menu">
            <div className="vault-mobile-menu-list">
              {userName && (
                <button
                  className="vault-mobile-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                >
                  Profile
                </button>
              )}
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className="vault-mobile-menu-item"
                  onClick={() => navigateAndClose(item.onClick)}
                >
                  {item.label}
                </button>
              ))}
              {primaryActions.map((action) => (
                <button
                  key={action.label}
                  className="vault-mobile-menu-item primary"
                  onClick={() => navigateAndClose(action.onClick)}
                >
                  {action.label}
                </button>
              ))}
              {ghostActions.map((action) => (
                <button
                  key={action.label}
                  className={`vault-mobile-menu-item ${
                    action.variant === "danger" ? "danger" : ""
                  }`}
                  onClick={() => navigateAndClose(action.onClick)}
                >
                  {action.label}
                </button>
              ))}
              {showSignOut && (
                <button
                  className="vault-mobile-menu-item danger"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Spacer so page content clears the fixed navbar */}
      <div className="vault-navbar-spacer" />
    </>
  );
}
