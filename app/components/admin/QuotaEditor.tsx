"use client";

import { Spinner } from "@/app/components/shared/Spinner";
import { useAsyncAction } from "@/app/components/shared/use-async-action";

interface QuotaEditorProps {
  gb: number;
  mb: number;
  saving: boolean;
  onGbChange: (value: number) => void;
  onMbChange: (value: number) => void;
  onApply: () => void;
}

export function QuotaEditor({
  gb,
  mb,
  saving,
  onGbChange,
  onMbChange,
  onApply,
}: QuotaEditorProps) {
  const { pending, execute } = useAsyncAction();
  const disabled = saving || (gb <= 0 && mb <= 0);

  return (
    <div className="border-t border-[#E5E7EB] pt-4">
      <p className="text-xs font-bold text-[#171717] uppercase tracking-wide mb-3">
        Adjust Quota
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-[#737373] mb-1.5 font-medium">
              GB
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={gb}
              onChange={(e) => onGbChange(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7] font-mono text-[#171717]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#737373] mb-1.5 font-medium">
              MB
            </label>
            <input
              type="number"
              min="0"
              max="1023"
              step="1"
              value={mb}
              onChange={(e) => onMbChange(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7] font-mono text-[#171717]"
            />
          </div>
        </div>
        <button
          onClick={() => execute(async () => onApply())}
          disabled={disabled || pending}
          className="bg-[#002FA7] hover:bg-[#002482] text-white font-bold text-sm py-2 px-4 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-[#002FA7]/20 cursor-pointer shrink-0"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" /> Saving...
            </span>
          ) : (
            "Apply"
          )}
        </button>
      </div>
    </div>
  );
}
