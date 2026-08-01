"use client";

import { Trash2 } from "lucide-react";

interface SelectionToolbarProps {
  totalItems: number;
  selectedCount: number;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  activeTab: "own" | "shared";
  onToggleSelectAll: () => void;
  onBatchDelete: () => void;
  onClear: () => void;
}

export function SelectionToolbar({
  totalItems,
  selectedCount,
  isAllSelected,
  isSomeSelected,
  activeTab,
  onToggleSelectAll,
  onBatchDelete,
  onClear,
}: SelectionToolbarProps) {
  return (
    <div className="flex flex-col gap-2 px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-[#525252] hover:text-[#171717]">
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={(input) => {
            if (input) input.indeterminate = isSomeSelected;
          }}
          onChange={onToggleSelectAll}
          className="w-4 h-4 rounded text-[#002FA7] border-[#D1D5DB] focus:ring-[#002FA7] cursor-pointer accent-[#002FA7]"
        />
        <span>Select All ({totalItems})</span>
      </label>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-semibold text-[#002FA7] bg-[rgba(0,47,167,0.08)] px-2.5 py-0.5 rounded-full border border-[rgba(0,47,167,0.2)]">
            {selectedCount} selected
          </span>
          <button
            onClick={onBatchDelete}
            className="flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold px-3 py-1 rounded-lg transition-all shadow-sm shadow-[#DC2626]/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {activeTab === "shared" ? "Remove Selected" : "Delete Selected"} (
            {selectedCount})
          </button>
          <button
            onClick={onClear}
            className="text-[#737373] hover:text-[#171717] font-medium underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
