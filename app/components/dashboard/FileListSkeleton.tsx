"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

const ROWS = 8;

export function FileListSkeleton() {
  return (
    <div
      className="divide-y divide-[#F5F5F5] px-2 py-2"
      aria-busy="true"
      aria-label="Loading files"
    >
      {Array.from({ length: ROWS }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-stretch justify-between py-3.5 px-3 rounded-xl border-transparent gap-3 sm:flex-row sm:items-center sm:px-4 sm:gap-4"
        >
          <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
            <Skeleton circle width={16} height={16} inline />
            <Skeleton width={40} height={40} borderRadius={12} inline />
            <div className="overflow-hidden min-w-0 flex-1">
              <Skeleton width="55%" height={14} />
              <div className="mt-1.5">
                <Skeleton width="30%" height={12} />
              </div>
            </div>
          </div>
          <Skeleton width={24} height={24} borderRadius={6} inline />
        </div>
      ))}
    </div>
  );
}
