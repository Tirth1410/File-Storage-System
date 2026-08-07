"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

const CARDS = 6;

export function GroupsGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      aria-busy="true"
      aria-label="Loading groups"
    >
      {Array.from({ length: CARDS }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm min-h-[190px] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Skeleton circle width={40} height={40} inline />
                <Skeleton width={100} height={16} inline />
              </div>
              <Skeleton width={48} height={20} borderRadius={9999} inline />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton width="90%" height={12} />
              <Skeleton width="70%" height={12} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#F5F5F5]">
            <Skeleton width={110} height={12} inline />
            <Skeleton width={40} height={12} inline />
          </div>
        </div>
      ))}
    </div>
  );
}
