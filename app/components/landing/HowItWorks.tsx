import { UserPlus, UploadCloud, Link2, ShieldCheck } from "lucide-react";
import { CTALink } from "./CTALink";
import { Reveal } from "./Reveal";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create your account",
    description:
      "Sign up with email or Google in seconds. You start with 200 MB of free, private storage.",
  },
  {
    icon: UploadCloud,
    step: "02",
    title: "Upload your files",
    description:
      "Drag and drop files up to 200 MB. They stream directly to secure cloud storage.",
  },
  {
    icon: Link2,
    step: "03",
    title: "Share on your terms",
    description:
      "Send a secure link or share with teammates — set preview, download, and expiry controls.",
  },
  {
    icon: ShieldCheck,
    step: "04",
    title: "Stay in control",
    description:
      "Watch your quota, review the audit log, and manage access any time.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-[73px] pt-[clamp(5rem,9vh,8rem)] pb-[clamp(4rem,8vh,7rem)] bg-white border-y border-[#E5E7EB]"
    >
      <div className="container-site">
        <Reveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2
              id="how-it-works-heading"
              className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-tighter text-[#171717] text-balance"
            >
              From file to shared link in under a minute
            </h2>
            <p className="mt-2.5 text-[clamp(1rem,1.1vw,1.125rem)] text-[#525252] leading-relaxed text-balance">
              No complicated setup. Just upload, share, and stay in control.
            </p>
          </div>
        </Reveal>

        <ol className="mt-[clamp(2.5rem,6vh,4.5rem)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
          {steps.map((step, i) => (
            <Reveal key={step.step} delay={i * 100}>
              <li className="relative h-full">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] border-t-2 border-dashed border-[#E5E7EB]"
                  />
                )}
                <div className="relative flex flex-col items-start">
                  <div className="flex items-center gap-4">
                    <span className="relative z-10 w-12 h-12 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm flex items-center justify-center">
                      <step.icon
                        className="w-5 h-5 text-[#002FA7]"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="font-mono text-sm text-[#A3A3A3] tracking-widest">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[17px] font-bold text-[#171717] tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#525252] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={200}>
          <div className="mt-[clamp(2rem,5vh,3.5rem)] flex justify-center">
            <CTALink href="/sign-up" size="lg" arrow>
              Get started in seconds
            </CTALink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
