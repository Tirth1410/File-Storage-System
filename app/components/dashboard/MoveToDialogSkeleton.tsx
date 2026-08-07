"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

export function MoveToDialogSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading folders">
      <div className="px-4 pt-3 pb-3 flex items-center gap-1">
        <Skeleton width={64} height={14} inline />
        <Skeleton width={16} height={14} inline />
        <Skeleton width={56} height={14} inline />
      </div>
      <div className="p-4 space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 px-3">
            <Skeleton width={20} height={20} borderRadius={6} inline />
            <Skeleton
              width={`${40 + (i % 3) * 15}%`}
              height={14}
              inline
            />
          </div>
        ))}
      </div>
    </div>
  );
}
