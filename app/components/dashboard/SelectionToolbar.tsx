"use client";

import { Trash2, ArrowRightToLine, CheckSquare, X } from "lucide-react";

interface SelectionToolbarProps {
  totalItems: number;
  selectedCount: number;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  selectionMode: boolean;
  canMove: boolean;
  deleteLabel: string;
  onEnterSelectionMode: () => void;
  onToggleSelectAll: () => void;
  onBatchMove: () => void;
  onBatchDelete: () => void;
  onClear: () => void;
  onDone: () => void;
}

export function SelectionToolbar({
  totalItems,
  selectedCount,
  isAllSelected,
  isSomeSelected,
  selectionMode,
  canMove,
  deleteLabel,
  onEnterSelectionMode,
  onToggleSelectAll,
  onBatchMove,
  onBatchDelete,
  onClear,
  onDone,
}: SelectionToolbarProps) {
  if (!selectionMode) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs">
        <button
          onClick={onEnterSelectionMode}
          className="flex items-center gap-1.5 font-semibold text-[#002FA7] hover:bg-[rgba(0,47,167,0.08)] px-2.5 py-1 rounded-lg transition-all cursor-pointer"
        >
          <CheckSquare className="w-4 h-4" />
          Select Files
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
          <button
            onClick={onBatchDelete}
            className="flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold px-3 py-1 rounded-lg transition-all shadow-sm shadow-[#DC2626]/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleteLabel} ({selectedCount})
          </button>
          <button
            onClick={onClear}
            className="text-[#737373] hover:text-[#171717] font-medium underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      <button
        onClick={onDone}
        className="flex items-center gap-1.5 text-[#737373] hover:text-[#171717] font-medium cursor-pointer"
      >
        <X className="w-4 h-4" />
        Done
      </button>
    </div>
  );
}
