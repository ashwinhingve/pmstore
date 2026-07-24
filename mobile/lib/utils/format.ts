/**
 * Formatting utilities for display values.
 *
 * These mirror the web's formatting logic but are tailored for React Native.
 * Money is always in rupees and rounded to 2 decimals.
 */

/**
 * Format currency (rupees).
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

/**
 * Format a number with thousands separator (Indian numbering).
 * Example: 1000000 → "10,00,000"
 */
export function formatIndianNumber(num: number): string {
  return num.toLocaleString('en-IN');
}

/**
 * Format date in Indian locale.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time of day.
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format datetime for display.
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }
  return text.slice(0, length).trim() + '...';
}
