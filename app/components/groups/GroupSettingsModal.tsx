"use client";

import { ModalShell } from "@/app/components/shared/ModalShell";
import { ErrorBanner } from "@/app/components/shared/ErrorBanner";
import { Spinner } from "@/app/components/shared/Spinner";
import { useAsyncAction } from "@/app/components/shared/use-async-action";

interface GroupSettingsModalProps {
  name: string;
  description: string;
  error: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onDeleteGroup: () => void;
}

export function GroupSettingsModal({
  name,
  description,
  error,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  onClose,
  onDeleteGroup,
}: GroupSettingsModalProps) {
  const { pending: savePending, execute: saveExecute } = useAsyncAction();
  const { pending: deletePending, execute: deleteExecute } = useAsyncAction();
  return (
    <ModalShell
      title="Edit Group Settings"
      onClose={onClose}
      containerClassName="p-3 sm:p-4"
    >
      <form
        onSubmit={(e) => saveExecute(async () => onSubmit(e))}
        className="p-4 space-y-4 sm:p-6"
      >
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
            className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#737373] mb-1 font-medium">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7] min-h-[80px]"
          />
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#171717] font-semibold py-2 rounded-xl text-sm transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savePending}
              className="flex-1 bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 rounded-xl text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savePending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" /> Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => deleteExecute(async () => onDeleteGroup())}
            disabled={deletePending}
            className="w-full bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.15)] hover:bg-[rgba(220,38,38,0.12)] text-[#DC2626] font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {deletePending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> Deleting...
              </span>
            ) : (
              "Delete Group Permanently"
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
