/**
 * Shared utility functions used across the application.
 */

/**
 * Formats a byte count into a human-readable string (e.g., "2.4 MB").
 */
export const formatBytes = (bytes: number | string, decimals = 2): string => {
  const b = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(b) || b === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

/**
 * Merges class names conditionally.
 */
export const cn = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(" ");

/**
 * Formats a date string to a locale date string.
 */
export const formatDate = (date: string | Date): string =>
  new Date(date).toLocaleDateString();

/**
 * Formats a date string to a locale date + time string.
 */
export const formatDateTime = (date: string | Date): string =>
  `${new Date(date).toLocaleDateString()} ${new Date(date).toLocaleTimeString()}`;
