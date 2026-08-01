"use client";

export type DetailTab = "files" | "members";

interface DetailTabsProps {
  active: DetailTab;
  fileCount: number;
  memberCount: number;
  onChange: (tab: DetailTab) => void;
}

export function DetailTabs({
  active,
  fileCount,
  memberCount,
  onChange,
}: DetailTabsProps) {
  return (
    <div className="flex overflow-x-auto border-b border-[#E5E7EB] gap-4">
      <TabButton
        active={active === "files"}
        label={`Files (${fileCount})`}
        onClick={() => onChange("files")}
      />
      <TabButton
        active={active === "members"}
        label={`Members (${memberCount})`}
        onClick={() => onChange("members")}
      />
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all cursor-pointer ${
        active
          ? "border-[#002FA7] text-[#002FA7]"
          : "border-transparent text-[#737373] hover:text-[#171717]"
      }`}
    >
      {label}
    </button>
  );
}
