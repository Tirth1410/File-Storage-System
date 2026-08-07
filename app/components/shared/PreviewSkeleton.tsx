"use client";

import { Skeleton } from "@/app/components/shared/Skeleton";

export function PreviewSkeleton() {
  return (
    <div
      className="flex items-center justify-center w-full h-full min-h-[300px]"
      aria-busy="true"
      aria-label="Loading preview"
    >
      <Skeleton width="80%" height={360} borderRadius={12} />
    </div>
  );
}
