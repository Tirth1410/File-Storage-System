"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

export function ProfileSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="space-y-5">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col items-center text-center gap-3 pb-5 border-b border-[#E5E7EB]">
            <Skeleton circle width={64} height={64} />
            <div className="space-y-2">
              <Skeleton width={120} height={16} />
              <Skeleton width={160} height={12} />
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton width={90} height={12} inline />
              <Skeleton width={70} height={12} inline />
            </div>
          ))}
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
          <Skeleton width={120} height={14} />
          <Skeleton width="100%" height={20} borderRadius={4} />
          <Skeleton width={80} height={12} />
        </div>
      </div>
      <div className="md:col-span-2 space-y-6">
        <div className="grid grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-2">
              <Skeleton width={80} height={12} />
              <Skeleton width={100} height={24} />
            </div>
          ))}
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <Skeleton width={120} height={14} />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex justify-between items-center px-6 py-3.5">
                <Skeleton width="40%" height={14} inline />
                <Skeleton width={140} height={12} inline />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
