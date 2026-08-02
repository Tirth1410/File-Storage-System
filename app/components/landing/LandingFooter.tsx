import { Logo } from "@/app/components/shared/Logo";
import { CTALink } from "./CTALink";

const footerLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Log in", href: "/sign-in" },
  { label: "Sign up", href: "/sign-up" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white">
      <div className="container-site py-12">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-3 text-center md:text-left">
            <Logo size="md" />
            <p className="max-w-xs text-sm text-[#737373] leading-relaxed">
              Secure file storage with fast, direct-to-cloud uploads and
              fine-grained sharing controls.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("/") ? (
                    <CTALink
                      href={link.href}
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1.5 -mx-1"
                    >
                      {link.label}
                    </CTALink>
                  ) : (
                    <a
                      href={link.href}
                      className="inline-flex px-2 py-1.5 -mx-1 rounded-full text-sm font-medium text-[#525252] hover:text-[#002FA7] hover:bg-[rgba(0,47,167,0.06)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002FA7]"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-[#F5F5F5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#A3A3A3]">
            © {new Date().getFullYear()} Vault. All rights reserved.
          </p>
          <p className="text-xs font-mono text-[#A3A3A3]">
            Powered by Cloudflare R2
          </p>
        </div>
      </div>
    </footer>
  );
}
