import { ShieldCheck } from "lucide-react";
import { CTALink } from "./CTALink";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section className="py-[clamp(4rem,8vh,7rem)]">
      <div className="container-site">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-[#002FA7] px-6 py-[clamp(3rem,7vh,6rem)] sm:px-16 text-center">
            {/* Decorative glows */}
            <div
              aria-hidden="true"
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[120%] h-72 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.22),transparent_70%)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)]"
            />

            <div className="relative">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/25 bg-white/10 text-xs font-medium text-white/90 backdrop-blur">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Free to start · No credit card
              </span>
              <h2 className="mt-6 text-[clamp(2rem,4vw,3rem)] font-bold tracking-tighter text-white text-balance">
                Ready to take control of your files?
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-[clamp(1rem,1.2vw,1.125rem)] text-white/80 leading-relaxed text-balance">
                Start storing in seconds. 200 MB free — and your first file
                uploads straight to the cloud.
              </p>
              <div className="mt-[clamp(2rem,5vh,3rem)] flex flex-col sm:flex-row items-center justify-center gap-4">
                <CTALink href="/sign-up" variant="inverse" size="lg" arrow>
                  Create your free account
                </CTALink>
                <CTALink href="/sign-in" variant="outline-light" size="lg">
                  Log in
                </CTALink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
