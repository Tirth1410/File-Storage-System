"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

export function UserDetailModalSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading user details"
    >
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
        <Skeleton width={100} height={14} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton width={48} height={12} />
              <Skeleton width={140} height={16} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
        <Skeleton width={140} height={14} />
        <Skeleton width="100%" height={20} borderRadius={4} />
        <div className="flex gap-4">
          <Skeleton width={120} height={36} borderRadius={8} />
          <Skeleton width={120} height={36} borderRadius={8} />
        </div>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
        <Skeleton width={120} height={14} />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton width={48} height={12} />
              <Skeleton width={64} height={24} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
        <Skeleton width={120} height={14} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 space-y-2"
            >
              <Skeleton width={100} height={12} />
              <Skeleton width={140} height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
