"use client";

import { ModalShell } from "@/app/components/shared/ModalShell";
import { ErrorBanner } from "@/app/components/shared/ErrorBanner";

interface CreateGroupModalProps {
  name: string;
  description: string;
  error: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function CreateGroupModal({
  name,
  description,
  error,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  onClose,
}: CreateGroupModalProps) {
  return (
    <ModalShell title="Create New Group" onClose={onClose}>
      <form onSubmit={onSubmit} className="p-4 space-y-4 sm:p-6">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="block text-xs text-[#737373] mb-1 font-medium">
            Group Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Engineering Team, Marketing, etc."
            className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#737373] mb-1 font-medium">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Details about the group members and purpose..."
            className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7] min-h-[80px]"
          />
        </div>
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#171717] font-semibold py-2 rounded-xl text-sm transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 rounded-xl text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer"
          >
            Create
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
