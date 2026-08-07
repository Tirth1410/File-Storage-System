"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

export function GroupDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading group">
      <Skeleton width={110} height={14} />
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton circle width={56} height={56} />
            <div className="space-y-2">
              <Skeleton width={180} height={20} />
              <Skeleton width={240} height={12} />
            </div>
          </div>
          <Skeleton width={72} height={32} borderRadius={8} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton width={240} height={28} />
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton circle width={32} height={32} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="50%" height={14} />
                  <Skeleton width="30%" height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
            <Skeleton width="70%" height={16} />
            <Skeleton width="100%" height={36} borderRadius={8} />
            <Skeleton width="100%" height={36} borderRadius={8} />
          </div>
        </div>
      </div>
    </div>
  );
}
