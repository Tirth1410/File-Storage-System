import {
  ChevronDown,
  CloudUpload,
  Gauge,
  Lock,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { CTALink } from "./CTALink";
import { Reveal } from "./Reveal";
import { ProductPreview } from "./ProductPreview";

const trustItems = [
  { icon: CloudUpload, label: "Direct cloud upload" },
  { icon: Lock, label: "Private by default" },
  { icon: Share2, label: "Share securely" },
  { icon: Gauge, label: "200 MB free" },
];

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh_-_4.5rem_+_2rem)] flex-col justify-center overflow-hidden pt-[clamp(3.5rem,7vh,7rem)] pb-[clamp(4rem,6vh,6rem)]">
      <div className="container-site">
        <div className="grid items-center gap-y-12 gap-x-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-x-14">
          {/* Left column — product messaging */}
          <div className="text-center lg:text-left">
            <Reveal>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#E5E7EB] bg-white text-xs font-medium text-[#525252] shadow-sm">
                <ShieldCheck
                  className="w-3.5 h-3.5 text-[#002FA7]"
                  aria-hidden="true"
                />
                Secure cloud storage for individuals &amp; teams
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-5 text-[clamp(2.25rem,3.4vw,3.25rem)] leading-[1.06] font-bold tracking-tighter text-[#171717] text-balance">
                Keep your files secure.
                <br />
                <span className="text-[#002FA7]">Share them in seconds.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-5 text-[clamp(1rem,1.1vw,1.125rem)] text-[#525252] leading-relaxed text-pretty max-w-xl mx-auto lg:mx-0">
                Vault uploads files up to 200&nbsp;MB straight to the cloud,
                shares them with fine-grained permissions, and keeps a full
                audit trail — all in one clean workspace.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <CTALink
                  href="/sign-up"
                  size="lg"
                  arrow
                  className="w-full sm:w-auto"
                >
                  Create free account
                </CTALink>
                <CTALink
                  href="/sign-in"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Log in
                </CTALink>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <ul className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2.5 text-sm text-[#737373]">
                {trustItems.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <item.icon
                      className="w-4 h-4 text-[#002FA7]"
                      aria-hidden="true"
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Right column — product preview */}
          <Reveal delay={400} className="w-full">
            <ProductPreview />
          </Reveal>
        </div>

        {/* Scroll-to-explore cue (hidden on short viewports to keep the hero above the fold) */}
        <Reveal
          delay={600}
          className="mt-[clamp(2.5rem,5vh,4rem)] [@media(max-height:819px)]:hidden"
        >
          <div className="flex justify-center">
            <a
              href="#features"
              aria-label="Scroll to explore features"
              className="group flex cursor-pointer flex-col items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002FA7]/40 focus-visible:ring-offset-2"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#A3A3A3] transition-colors duration-300 group-hover:text-[#002FA7]">
                Scroll to explore
              </span>
              <span
                className="scroll-ping absolute mt-[23px] h-10 w-10 rounded-full bg-[#002FA7]/10"
                aria-hidden="true"
              />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E5] bg-white/80 shadow-[0_1px_2px_rgba(23,23,23,0.06),0_4px_12px_rgba(23,23,23,0.06)] backdrop-blur-sm transition-all duration-300 group-hover:border-[#002FA7]/30 group-hover:bg-[rgba(0,47,167,0.04)]">
                <ChevronDown
                  className="scroll-bounce h-4 w-4 text-[#002FA7]"
                  aria-hidden="true"
                />
              </span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
