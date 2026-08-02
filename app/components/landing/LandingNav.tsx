"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/app/components/shared/Logo";
import { CTALink } from "./CTALink";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
];

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#FAFAFA]/85 backdrop-blur-xl border-b border-[#E5E7EB]/70 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav
        aria-label="Main navigation"
        className="container-site flex items-center justify-between py-4"
      >
        {/* Brand */}
        <Link
          href="/"
          aria-label="Vault — home"
          onClick={closeMenu}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002FA7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAFA]"
        >
          <Logo size="md" />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3.5 py-2 rounded-full text-sm font-medium text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F5] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002FA7]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <CTALink href="/sign-in" variant="ghost" size="md" className="px-4">
            Log in
          </CTALink>
          <CTALink href="/sign-up" size="md" arrow>
            Get Started
          </CTALink>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-[#171717] hover:bg-[#F5F5F5] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002FA7]"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[72px] bottom-0 bg-[#FAFAFA] flex flex-col px-4 pt-4 pb-8 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="px-4 py-3.5 rounded-2xl text-[17px] font-medium text-[#171717] hover:bg-[#F5F5F5] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <CTALink
              href="/sign-in"
              variant="secondary"
              size="lg"
              className="w-full"
              onNavigate={closeMenu}
            >
              Log in
            </CTALink>
            <CTALink
              href="/sign-up"
              size="lg"
              arrow
              className="w-full"
              onNavigate={closeMenu}
            >
              Get Started
            </CTALink>
          </div>
        </div>
      )}
    </header>
  );
}
