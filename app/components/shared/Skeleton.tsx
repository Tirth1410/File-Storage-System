"use client";

import LoadingSkeleton from "react-loading-skeleton";
import type { ComponentProps } from "react";

export const SKELETON_BASE_COLOR = "#E5E7EB";
export const SKELETON_HIGHLIGHT_COLOR = "#F5F5F5";
export const SKELETON_BORDER_RADIUS = 8;

type SkeletonProps = ComponentProps<typeof LoadingSkeleton>;

export function Skeleton({
  baseColor = SKELETON_BASE_COLOR,
  highlightColor = SKELETON_HIGHLIGHT_COLOR,
  borderRadius = SKELETON_BORDER_RADIUS,
  ...props
}: SkeletonProps) {
  return (
    <LoadingSkeleton
      baseColor={baseColor}
      highlightColor={highlightColor}
      borderRadius={borderRadius}
      {...props}
    />
  );
}
