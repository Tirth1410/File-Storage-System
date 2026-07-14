/**
 * StatusBadge — a pill-shaped status indicator.
 * Variants: active, banned, admin, user, warning.
 */

type BadgeVariant = "active" | "banned" | "admin" | "user" | "warning" | "info";

const styles: Record<BadgeVariant, string> = {
  active:
    "bg-[rgba(22,163,74,0.1)] text-[#16A34A] border border-[rgba(22,163,74,0.25)]",
  banned:
    "bg-[rgba(220,38,38,0.1)] text-[#DC2626] border border-[rgba(220,38,38,0.25)]",
  admin:
    "bg-[rgba(0,47,167,0.08)] text-[#002FA7] border border-[rgba(0,47,167,0.2)]",
  user: "bg-[#F5F5F5] text-[#525252] border border-[#E5E7EB]",
  warning:
    "bg-[rgba(217,119,6,0.1)] text-[#D97706] border border-[rgba(217,119,6,0.25)]",
  info: "bg-[rgba(0,47,167,0.08)] text-[#002FA7] border border-[rgba(0,47,167,0.2)]",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
}

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
