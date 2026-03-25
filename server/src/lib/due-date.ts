import { midnightToday, tomorrowDateString, isValidTimezone } from "./timezone";

/** Adds intervalDays to `now` and returns the resulting Date. */
export function computeDueAt(now: Date, intervalDays: number): Date {
  const result = new Date(now);
  result.setDate(result.getDate() + intervalDays);
  return result;
}

/** Formats a UTC Date as YYYY-MM-DD in the user's timezone. */
export function computeDueDate(dueAt: Date, timezone: string): string {
  const tz = isValidTimezone(timezone) ? timezone : "UTC";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(dueAt);
}

/**
 * Halves the interval for distracted reviews.
 * Enforces a minimum of 1 day so the card doesn't become immediately due.
 */
export function applyEffortHalving(intervalDays: number): number {
  return Math.max(1, Math.round(intervalDays / 2));
}

/** Returns tomorrow at midnight in the user's timezone as a UTC Date. */
export function tomorrowDueAt(timezone: string): Date {
  const todayMidnight = midnightToday(timezone);
  const tomorrow = new Date(todayMidnight);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/** Returns tomorrow's date as YYYY-MM-DD in the user's timezone. */
export function tomorrowDueDate(timezone: string): string {
  return tomorrowDateString(timezone);
}
