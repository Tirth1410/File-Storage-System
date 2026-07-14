/**
 * StorageBar — displays a labelled storage utilisation progress bar.
 * Used on Dashboard, Profile, and Admin user detail modal.
 */

import { formatBytes } from "@/app/lib/utils";

interface StorageBarProps {
  usedBytes: string | number;
  quotaBytes: string | number;
  utilization: number;
  /** compact: just a bar + percentages. full: includes used/remaining rows */
  variant?: "compact" | "full";
}

export function StorageBar({
  usedBytes,
  quotaBytes,
  utilization,
  variant = "compact",
}: StorageBarProps) {
  const pct = Math.min(100, Math.max(0, utilization));
  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-[#002FA7]";

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs font-mono text-[#737373]">
        <span>{pct}% used</span>
        <span>{formatBytes(quotaBytes)} total</span>
      </div>

      {variant === "full" && (
        <div className="border-t border-[#E5E7EB] pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#737373]">Used</span>
            <span className="font-mono font-medium text-[#171717]">
              {formatBytes(usedBytes)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#737373]">Available</span>
            <span className="font-mono font-semibold text-[#16A34A]">
              {formatBytes(Math.max(0, Number(quotaBytes) - Number(usedBytes)))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
