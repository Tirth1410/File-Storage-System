import Image from "next/image";
import { Lock } from "lucide-react";

/**
 * ProductPreview — one unified product showcase: the real Vault dashboard as
 * the primary desktop experience inside a browser mockup, with a real mobile
 * view of Vault overlaid on the bottom-right corner. Non-interactive by design
 * (pointer-events-none) so it reads as a product screenshot, not a clickable
 * UI. Only the outer frames carry gentle floating animations.
 */

export function ProductPreview() {
  return (
    <div className="w-full relative select-none pointer-events-none">
      {/* Desktop application (primary hero element) */}
      <div className="hero-float">
        <div className="hero-float-shadow relative bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
          {/* Browser chrome */}
          <div className="h-11 flex items-center gap-3 px-4 bg-[#FAFAFA] border-b border-[#E5E7EB]">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="w-3 h-3 rounded-full bg-[#E5E7EB]" />
              <span className="w-3 h-3 rounded-full bg-[#E5E7EB]" />
              <span className="w-3 h-3 rounded-full bg-[#E5E7EB]" />
            </div>
            <div className="flex-1 max-w-xs mx-auto bg-white border border-[#E5E7EB] rounded-lg px-3 py-1 font-mono text-[11px] text-[#737373] truncate">
              https://vault.app/dashboard
            </div>
            <Lock className="w-3.5 h-3.5 text-[#A3A3A3]" aria-hidden="true" />
          </div>

          <Image
            src="/screenshots/dashboard.png"
            alt="Vault desktop dashboard showing storage usage, folders and files"
            width={1600}
            height={1000}
            sizes="(min-width: 1024px) min(48vw, 640px), 100vw"
            className="w-full h-auto"
            priority
          />
        </div>
      </div>

      {/* Mobile app (secondary device, overlapped bottom-right) */}
      <div className="phone-float absolute right-0 bottom-[-3rem] sm:bottom-[-3.5rem] w-[35%] min-w-[118px] max-w-[200px]">
        <div className="rounded-[1.9rem] sm:rounded-[2.1rem] bg-[#0B0B0C] p-[5px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/40">
          {/* Screen */}
          <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[1.65rem] bg-[#FAFAFA] aspect-[1/2]">
            <Image
              src="/screenshots/mobile.png"
              alt="Vault on mobile showing recent files and storage usage"
              width={500}
              height={1000}
              sizes="(min-width: 1024px) 200px, 35vw"
              className="w-full h-full object-cover object-top"
            />
            {/* Dynamic island */}
            <div
              aria-hidden="true"
              className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[30%] h-4 bg-black rounded-full"
            />
          </div>
          {/* Home indicator */}
          <div
            aria-hidden="true"
            className="mt-[5px] mx-auto w-16 h-[4px] bg-white/90 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
