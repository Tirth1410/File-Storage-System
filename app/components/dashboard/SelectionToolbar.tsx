"use client";

import { Trash2, ArrowRightToLine, ListChecks, Share2 } from "lucide-react";

interface SelectionToolbarProps {
  totalItems: number;
  selectedCount: number;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  selectionMode: boolean;
  canMove: boolean;
  canShare: boolean;
  deleteLabel: string;
  onEnterSelectionMode: () => void;
  onToggleSelectAll: () => void;
  onBatchMove: () => void;
  onBatchShare: () => void;
  onBatchDelete: () => void;
  onDone: () => void;
}

export function SelectionToolbar({
  totalItems,
  selectedCount,
  isAllSelected,
  isSomeSelected,
  selectionMode,
  canMove,
  canShare,
  deleteLabel,
  onEnterSelectionMode,
  onToggleSelectAll,
  onBatchMove,
  onBatchShare,
  onBatchDelete,
  onDone,
}: SelectionToolbarProps) {
  if (!selectionMode) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs">
        <button
          onClick={onEnterSelectionMode}
          className="flex items-center gap-1.5 font-semibold text-[#002FA7] hover:bg-[rgba(0,47,167,0.08)] px-2.5 py-1 rounded-lg transition-all cursor-pointer"
        >
          <ListChecks className="w-4 h-4" />
          Select
        </button>
      </div>
    );
  }

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
          {canMove && (
            <button
              onClick={onBatchMove}
              className="flex items-center gap-1.5 bg-[#002FA7] hover:bg-[#002482] text-white font-bold px-3 py-1 rounded-lg transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer"
            >
              <ArrowRightToLine className="w-3.5 h-3.5" />
              Move ({selectedCount})
            </button>
          )}
          {canShare && (
            <button
              onClick={onBatchShare}
              className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white font-bold px-3 py-1 rounded-lg transition-all shadow-sm shadow-[#059669]/20 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share ({selectedCount})
            </button>
          )}
          <button
            onClick={onBatchDelete}
            className="flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold px-3 py-1 rounded-lg transition-all shadow-sm shadow-[#DC2626]/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleteLabel} ({selectedCount})
          </button>
        </div>
      )}

      <button
        onClick={onDone}
        className="flex items-center gap-1.5 text-[#525252] hover:text-[#171717] font-semibold px-2.5 py-1 rounded-lg border border-[#D1D5DB] hover:border-[#A3A3A3] bg-white cursor-pointer transition-all"
      >
        Clear
      </button>
    </div>
  );
}
