import { Zap, Share2, Lock, ScrollText, Users, Gauge } from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  {
    icon: Zap,
    title: "Lightning-fast uploads",
    description:
      "Files up to 200 MB stream straight from your browser to the cloud in parallel chunks — nothing bottlenecks on our servers.",
  },
  {
    icon: Share2,
    title: "Share with precision",
    description:
      "Generate secure links with separate preview and download toggles, optional expiry, or share directly with teammates and groups.",
  },
  {
    icon: Lock,
    title: "Private by default",
    description:
      "Your storage is never publicly exposed. Every view and download uses short-lived signed URLs that expire in minutes.",
  },
  {
    icon: ScrollText,
    title: "Total visibility",
    description:
      "Every upload, download, and share is recorded in an audit trail you can review anytime, from anywhere.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description:
      "Create groups, assign roles, and control exactly who can preview or download each file you share.",
  },
  {
    icon: Gauge,
    title: "Storage you can see",
    description:
      "Track your quota at a glance with live utilization bars across the dashboard, profile, and admin views.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-[73px] py-[clamp(3rem,6vh,5.25rem)]"
    >
      <div className="container-site">
        <Reveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2
              id="features-heading"
              className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-tighter text-[#171717] text-balance"
            >
              Everything you need to move and share files safely
            </h2>
            <p className="mt-2 text-[clamp(1rem,1.1vw,1.125rem)] text-[#525252] leading-relaxed text-balance">
              Fast uploads, precise permissions, and complete control — without
              the clutter.
            </p>
          </div>
        </Reveal>

        <div className="mt-[clamp(1.5rem,3.5vh,2.75rem)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3.5 sm:gap-x-5 sm:gap-y-4">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 80}>
              <article className="group h-full bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 hover:border-[#D1D5DB]">
                <div className="w-10 h-10 bg-[rgba(0,47,167,0.08)] border border-[rgba(0,47,167,0.2)] rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <feature.icon
                    className="w-5 h-5 text-[#002FA7]"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-3 text-[17px] font-bold text-[#171717] tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm text-[#525252] leading-relaxed">
                  {feature.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
