"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

export function AdminStatsGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
      aria-busy="true"
      aria-label="Loading statistics"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 min-h-[112px]"
        >
          <div className="flex justify-between items-center">
            <Skeleton width={80} height={12} inline />
            <Skeleton circle width={20} height={20} inline />
          </div>
          <Skeleton width="55%" height={24} />
          <Skeleton width="85%" height={12} />
        </div>
      ))}
    </div>
  );
}
