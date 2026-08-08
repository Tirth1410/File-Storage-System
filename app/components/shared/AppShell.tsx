/**
 * AppShell — Premium floating glassmorphic navbar.
 * Features: scroll-aware shrink, smooth hover lift, sliding active indicator,
 * primary nav tabs (Dashboard / Groups / Admin), dark glassmorphism.
 */
"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/app/lib/auth-client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Logo } from "@/app/components/shared/Logo";
import { UserAvatar } from "@/app/components/shared/UserAvatar";
import { Menu, X } from "lucide-react";
import { Spinner } from "@/app/components/shared/Spinner";
import "./AppShell.css";

interface AppShellProps {
  /** Name of the logged-in user */
  userName?: string;
  avatarUrl?: string | null;
  /** Show the Admin nav tab. Defaults to false. */
  isAdmin?: boolean;
  /** Show sign-out button. Defaults to true. */
  showSignOut?: boolean;
}

export function AppShell({
  userName,
  avatarUrl,
  isAdmin = false,
  showSignOut = true,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const actionRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const hoverRafRef = useRef<number | null>(null);

  /* ── Active nav item derived from the current pathname ── */
  const activeLabel = useMemo(() => {
    if (!pathname) return null;
    if (pathname.startsWith("/admin")) return "Admin";
    if (pathname.startsWith("/group")) return "Groups";
    if (pathname.startsWith("/shared")) return "Shared Files";
    if (pathname.startsWith("/dashboard")) return "Dashboard";
    if (pathname.startsWith("/profile")) return "Profile";
    return null;
  }, [pathname]);

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
    hoverRafRef.current = requestAnimationFrame(() => {
      if (label && label === activeLabel) {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }
      updateIndicator(label);
    });
  };

  useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null)
        cancelAnimationFrame(hoverRafRef.current);
    };
  }, []);

  /* ── Nav items: primary tabs ── */
  const navItems: Array<{ label: string; href: string }> = [];
  if (userName) {
    navItems.push({ label: "Dashboard", href: "/dashboard" });
    navItems.push({ label: "Shared Files", href: "/shared" });
    navItems.push({ label: "Groups", href: "/groups" });
  }
  if (isAdmin) {
    navItems.push({ label: "Admin", href: "/admin" });
  }

  const handleSignOut = async () => {
    setMenuOpen(false);
    setSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.replace("/sign-in");
          },
        },
      });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className={`vault-navbar${scrolled ? " scrolled" : ""}`}>
        <div className="vault-navbar-inner" data-tour="navbar">
          {/* ── Left: Logo ── */}
          <Link
            href="/dashboard"
            className="vault-logo"
            aria-label="Go to Dashboard"
            onClick={() => setMenuOpen(false)}
          >
            <Logo size="md" />
          </Link>

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
                <Link
                  key={item.label}
                  ref={(el) => {
                    actionRefs.current[item.label] = el;
                  }}
                  href={item.href}
                  className={`vault-nav-btn${
                    item.label === activeLabel ? " active" : ""
                  }`}
                  aria-current={item.label === activeLabel ? "page" : undefined}
                  onMouseEnter={() => handleHover(item.label)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* ── Right: User (desktop) ── */}
          <div className="vault-actions">
            {/* User badge */}
            {userName && (
              <Link
                href="/profile"
                className="vault-user-badge"
                aria-label="Go to Profile"
                data-tour="user-badge"
              >
                <UserAvatar
                  image={avatarUrl}
                  name={userName}
                  className="w-[26px] h-[26px] text-[11px]"
                />
                <span className="vault-user-name">{userName}</span>
              </Link>
            )}

            {/* Sign Out */}
            {showSignOut && (
              <>
                {userName && <div className="vault-sep" />}
                <button
                  className="vault-btn-ghost disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" /> Signing out...
                    </span>
                  ) : (
                    "Sign Out"
                  )}
                </button>
              </>
            )}
          </div>

          {/* ── Right: User + Menu (mobile) ── */}
          <div className="vault-mobile-controls">
            {userName && (
              <Link
                href="/profile"
                className="vault-user-badge"
                aria-label="Go to Profile"
                onClick={() => setMenuOpen(false)}
              >
                <UserAvatar
                  image={avatarUrl}
                  name={userName}
                  className="w-[26px] h-[26px] text-[11px]"
                />
              </Link>
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
                <Link
                  href="/profile"
                  className={`vault-mobile-menu-item${
                    activeLabel === "Profile" ? " active" : ""
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
              )}
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`vault-mobile-menu-item${
                    item.label === activeLabel ? " active" : ""
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {showSignOut && (
                <button
                  className="vault-mobile-menu-item danger disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" /> Signing out...
                    </span>
                  ) : (
                    "Sign Out"
                  )}
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
