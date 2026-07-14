/**
 * Design system constants — single source of truth for the Klein Blue palette.
 * Import these throughout the app to keep colours consistent.
 */
export const PALETTE = {
  accent: "#002FA7",
  accentHover: "#002482",
  accentLight: "rgba(0,47,167,0.08)",
  accentBorder: "rgba(0,47,167,0.2)",
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceHover: "#F5F5F5",
  border: "#E5E7EB",
  borderHover: "#D1D5DB",
  text: "#171717",
  textMuted: "#525252",
  textFaint: "#737373",
  success: "#16A34A",
  successBg: "rgba(22,163,74,0.08)",
  successBorder: "rgba(22,163,74,0.2)",
  error: "#DC2626",
  errorBg: "rgba(220,38,38,0.08)",
  errorBorder: "rgba(220,38,38,0.2)",
  warning: "#D97706",
  warningBg: "rgba(217,119,6,0.08)",
} as const;
