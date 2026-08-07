"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

export function ShareModalSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading share options"
    >
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4 sm:p-5">
        <Skeleton width={150} height={16} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton width={16} height={16} borderRadius={4} inline />
              <Skeleton width={110} height={14} inline />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Skeleton width={90} height={12} />
            <Skeleton width="100%" height={38} borderRadius={8} />
          </div>
          <Skeleton width={96} height={38} borderRadius={8} />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton width={140} height={12} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton width="70%" height={14} />
              <Skeleton width="45%" height={12} />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton width={56} height={28} borderRadius={8} inline />
              <Skeleton width={28} height={28} borderRadius={8} inline />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
