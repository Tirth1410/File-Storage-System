"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

const ROWS = 6;

export function UsersTableSkeleton() {
  return (
    <div
      className="overflow-x-auto"
      aria-busy="true"
      aria-label="Loading users"
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#E5E7EB] text-xs font-bold uppercase tracking-wide text-[#737373]">
            <th className="px-6 py-4">User</th>
            <th className="px-6 py-4">Email</th>
            <th className="px-6 py-4">Role</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Quota</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F5F5F5]">
          {Array.from({ length: ROWS }).map((_, i) => (
            <tr key={i}>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Skeleton circle width={28} height={28} inline />
                  <div className="space-y-1.5">
                    <Skeleton width={120} height={14} />
                    <Skeleton width={160} height={10} />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <Skeleton width={180} height={14} inline />
              </td>
              <td className="px-6 py-4">
                <Skeleton width={56} height={20} borderRadius={9999} inline />
              </td>
              <td className="px-6 py-4">
                <Skeleton width={56} height={20} borderRadius={9999} inline />
              </td>
              <td className="px-6 py-4">
                <Skeleton width={120} height={12} inline />
                <div className="w-28 h-1.5 bg-[#E5E7EB] rounded-full mt-2" />
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <Skeleton width={28} height={28} borderRadius={8} inline />
                  <Skeleton width={28} height={28} borderRadius={8} inline />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
