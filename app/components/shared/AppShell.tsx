/**
 * AppShell — Premium floating glassmorphic navbar.
 * Features: scroll-aware shrink, smooth hover lift, sliding active indicator,
 * primary nav tabs (Dashboard / Groups / Admin), dark glassmorphism.
 */
"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/lib/auth-client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Logo } from "@/app/components/shared/Logo";
import { Menu, X } from "lucide-react";
import "./AppShell.css";

interface AppShellProps {
  /** Name of the logged-in user */
  userName?: string;
  /** Show the Admin nav tab. Defaults to false. */
  isAdmin?: boolean;
  /** Show sign-out button. Defaults to true. */
  showSignOut?: boolean;
}

export function AppShell({
  userName,
  isAdmin = false,
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
  const hoverRafRef = useRef<number | null>(null);

  /* ── Scroll listener ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Sliding indicator calculation (RAF-debounced to avoid forced reflow) ── */
  const updateIndicator = useCallback((label: string | null) => {
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
  }, []);

  const handleHover = (label: string | null) => {
    if (hoverRafRef.current !== null) cancelAnimationFrame(hoverRafRef.current);
    hoverRafRef.current = requestAnimationFrame(() => updateIndicator(label));
  };

  useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null)
        cancelAnimationFrame(hoverRafRef.current);
    };
  }, []);

  /* ── Nav items: primary tabs ── */
  const navItems: Array<{
    label: string;
    onClick: () => void;
    admin?: boolean;
  }> = [];
  if (userName) {
    navItems.push({
      label: "Dashboard",
      onClick: () => router.push("/dashboard"),
    });
    navItems.push({ label: "Groups", onClick: () => router.push("/groups") });
  }
  if (isAdmin) {
    navItems.push({
      label: "Admin",
      onClick: () => router.push("/admin"),
      admin: true,
    });
  }

  const navigateAndClose = (onClick: () => void) => {
    setMenuOpen(false);
    onClick();
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace("/sign-in");
        },
      },
    });
  };

  return (
    <>
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
                  className={`vault-nav-btn${
                    item.admin ? " vault-nav-btn-admin" : ""
                  }`}
                  onClick={item.onClick}
                  onMouseEnter={() => handleHover(item.label)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {/* ── Right: User (desktop) ── */}
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

            {/* Sign Out */}
            {showSignOut && (
              <>
                {userName && <div className="vault-sep" />}
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
                  className={`vault-mobile-menu-item${
                    item.admin ? " primary" : ""
                  }`}
                  onClick={() => navigateAndClose(item.onClick)}
                >
                  {item.label}
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
