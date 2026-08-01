"use client";

interface FileTabToggleProps {
  activeTab: "own" | "shared";
  onChange: (tab: "own" | "shared") => void;
}

export function FileTabToggle({ activeTab, onChange }: FileTabToggleProps) {
  return (
    <div
      className="flex bg-[#F5F5F5] border border-[#E5E7EB] rounded-lg p-0.5"
      data-tour="file-tabs"
    >
      {(["own", "shared"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
            activeTab === tab
              ? "bg-white text-[#002FA7] shadow-sm border border-[#E5E7EB]"
              : "text-[#737373] hover:text-[#171717]"
          } cursor-pointer`}
        >
          {tab === "own" ? "My Files" : "Shared"}
        </button>
      ))}
    </div>
  );
}
