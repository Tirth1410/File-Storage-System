/**
 * StatCard — a simple metric card used on admin dashboard.
 */

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  /** Slot for an optional progress bar or extra content */
  children?: React.ReactNode;
}

export function StatCard({ label, value, sub, icon, children }: StatCardProps) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">
          {label}
        </span>
        <span className="text-[#002FA7]">{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-[#171717]">
          {value}
        </div>
        {sub && (
          <p className="text-xs text-[#737373] mt-0.5 font-mono">{sub}</p>
        )}
      </div>
      {children}
    </div>
  );
}
