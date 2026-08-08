"use client";

import { SectionCard } from "@/app/components/shared/SectionCard";
import { ErrorBanner } from "@/app/components/shared/ErrorBanner";
import { Spinner } from "@/app/components/shared/Spinner";
import { useAsyncAction } from "@/app/components/shared/use-async-action";

interface InviteMemberFormProps {
  email: string;
  role: "ADMIN" | "MEMBER";
  error: string;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: "ADMIN" | "MEMBER") => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function InviteMemberForm({
  email,
  role,
  error,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: InviteMemberFormProps) {
  const { pending, execute } = useAsyncAction();
  return (
    <SectionCard title="Invite Member">
      <form
        onSubmit={(e) => execute(async () => onSubmit(e))}
        className="space-y-4"
      >
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="block text-xs text-[#737373] mb-1 font-medium">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="collaborator@example.com"
            className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#002FA7]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#737373] mb-1 font-medium">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value as "ADMIN" | "MEMBER")}
            className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7]"
          >
            <option value="MEMBER">
              MEMBER (Can view and download shared files)
            </option>
            <option value="ADMIN">ADMIN (Can manage files and members)</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" /> Inviting...
            </span>
          ) : (
            "Send Invitation"
          )}
        </button>
      </form>
    </SectionCard>
  );
}
