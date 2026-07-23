"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/app/components/shared/Logo";
import {
  ArrowRight,
  HardDrive,
  FileText,
  Lock,
  Zap,
  Folder,
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#171717] font-sans selection:bg-[#002FA7]/20 selection:text-[#002FA7] flex flex-col relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-80" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 max-w-[1400px] w-full mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-8 text-sm font-medium">
          <button
            onClick={() => router.push("/sign-in")}
            className="text-[#525252] hover:text-[#002FA7] transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => router.push("/sign-up")}
            className="bg-[#002FA7] text-white px-6 py-2.5 rounded-full hover:bg-[#002482] transition-transform hover:scale-105 active:scale-95 shadow-sm"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 mt-16 md:mt-10">
        <div className="max-w-4xl text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E5E7EB] bg-white/80 backdrop-blur-md mb-8 text-xs font-mono text-[#002FA7] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#002FA7] animate-pulse" />
            System Operational
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05] mb-6 text-balance text-[#171717]">
            Storage designed for <br />
            <span className="text-[#002FA7]">absolute precision.</span>
          </h1>
          <p className="text-lg md:text-xl text-[#525252] max-w-2xl mb-10 leading-relaxed text-balance">
            A minimalist, high-performance file platform that gets out of your
            way. Fast uploads, strict privacy, and zero clutter.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => router.push("/sign-up")}
              className="group flex items-center gap-2 bg-[#002FA7] text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-[#002482] transition-all hover:shadow-[0_0_30px_-10px_rgba(0,47,167,0.6)]"
            >
              Start Storing
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform opacity-90 text-white" />
            </button>
          </div>
        </div>

        {/* Signature Element: The File Node UI */}
        <div className="mt-20 w-full max-w-4xl relative group pb-20">
          <div className="absolute inset-0 bg-gradient-to-b from-[#002FA7]/10 to-transparent blur-3xl -z-10 rounded-[3rem]" />
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xl shadow-black/5 overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-black/10 transform-gpu group-hover:-translate-y-2 group-hover:border-[#D1D5DB]">
            {/* Window Controls */}
            <div className="h-12 border-b border-[#E5E7EB] bg-[#FAFAFA] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-[#D1D5DB]" />
              <div className="w-3 h-3 rounded-full bg-[#D1D5DB]" />
              <div className="w-3 h-3 rounded-full bg-[#D1D5DB]" />
              <div className="ml-4 flex items-center gap-2 font-mono text-xs text-[#525252]">
                <Folder className="w-3 h-3 text-[#525252]" />
                <span>~/vault/projects/q3</span>
              </div>
            </div>
            {/* File List */}
            <div className="p-6 grid gap-2">
              {[
                {
                  name: "Q3_Financial_Report.pdf",
                  size: "2.4 MB",
                  type: "PDF",
                  icon: FileText,
                },
                {
                  name: "branding_assets_v2.zip",
                  size: "148 MB",
                  type: "ARCHIVE",
                  icon: Zap,
                },
                {
                  name: "database_backup.sql",
                  size: "12 GB",
                  type: "DATA",
                  icon: HardDrive,
                },
                {
                  name: "private_keys.pem",
                  size: "4 KB",
                  type: "SECURE",
                  icon: Lock,
                },
              ].map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAFAFA] transition-colors cursor-default border border-transparent hover:border-[#E5E7EB]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white border border-[#E5E7EB] text-[#171717] flex items-center justify-center shadow-sm">
                      <file.icon className="w-5 h-5 stroke-[1.5] text-[#525252] group-hover:text-[#002FA7] transition-colors" />
                    </div>
                    <div>
                      <div className="font-medium text-[15px] text-[#171717]">
                        {file.name}
                      </div>
                      <div className="font-mono text-[11px] text-[#737373] mt-0.5 tracking-wider">
                        {file.type}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-sm text-[#525252]">
                    {file.size}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
