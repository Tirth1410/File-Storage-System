import { LandingNav } from "@/app/components/landing/LandingNav";
import { Hero } from "@/app/components/landing/Hero";
import { Features } from "@/app/components/landing/Features";
import { HowItWorks } from "@/app/components/landing/HowItWorks";
import { FinalCTA } from "@/app/components/landing/FinalCTA";
import { LandingFooter } from "@/app/components/landing/LandingFooter";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#171717] font-sans selection:bg-[#002FA7]/20 selection:text-[#002FA7] flex flex-col">
      <LandingNav />

      <div className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <FinalCTA />
      </div>

      <LandingFooter />
    </main>
  );
}
