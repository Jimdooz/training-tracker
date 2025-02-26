/**
 * Date range types for filtering statistics
 */
export type DateRange = 'last30days' | 'last3months' | 'last6months' | 'lastyear' | 'alltime';

/**
 * Get start date for a given date range
 */
export function getStartDateForRange(range: DateRange): Date {
  const today = new Date();
  
  switch (range) {
    case 'last30days':
      return new Date(today.setDate(today.getDate() - 30));
    
    case 'last3months':
      return new Date(today.setMonth(today.getMonth() - 3));
    
    case 'last6months':
      return new Date(today.setMonth(today.getMonth() - 6));
    
    case 'lastyear':
      return new Date(today.setFullYear(today.getFullYear() - 1));
    
    case 'alltime':
    default:
      return new Date(0); // Beginning of time (1970)
  }
}

/**
 * Format date range in a friendly way
 */
export function formatDateRange(range: DateRange): string {
  switch (range) {
    case 'last30days':
      return 'Last 30 days';
    case 'last3months':
      return 'Last 3 months';
    case 'last6months':
      return 'Last 6 months';
    case 'lastyear':
      return 'Last year';
    case 'alltime':
      return 'All time';
  }
}

/**
 * Format a date number to ensure it has two digits
 */
export function twoDigits(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Format a date for display (DD/MM/YYYY)
 */
export function formatDate(date: Date): string {
  return `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Format for CSV export (YYYY-MM-DD)
 */
export function formatDateForExport(date: Date): string {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

/**
 * Get current week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/**
 * Format a date as "Week X, YYYY"
 */
export function formatWeek(date: Date): string {
  return `Week ${getWeekNumber(date)}, ${date.getFullYear()}`;
}

/**
 * Format a date as "Month YYYY"
 */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
